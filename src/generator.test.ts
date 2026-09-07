import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";
import {
  buildFileRegistry,
  generateRoutesModule,
  importSpecifier,
  parseRouteSegments,
  routeKeyForSegments,
  toIdentifier,
} from "./generator.js";
import { scanDirectory } from "./tree.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rfr-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeConfig(adapter = "react-router") {
  mkdirSync(join(dir, "pages", "users"), { recursive: true });
  writeFileSync(join(dir, "pages", "index.tsx"), "export default function Home() {}");
  writeFileSync(join(dir, "pages", "layout.tsx"), "export default function RootLayout() {}");
  writeFileSync(join(dir, "pages", "about.tsx"), "export default function About() {}");
  writeFileSync(join(dir, "pages", "users", "index.tsx"), "export default function Users() {}");
  writeFileSync(join(dir, "pages", "users", "loading.tsx"), "export default function UsersLoading() {}");
  return resolveConfig({ pages: join(dir, "pages"), outDir: join(dir, "out"), adapter }, dir);
}

describe("toIdentifier", () => {
  it("sanitizes file names into identifiers", () => {
    expect(toIdentifier("/x/about.tsx")).toBe("about");
    expect(toIdentifier("/x/[id].tsx")).toBe("_id_");
  });
});

describe("parseRouteSegments and routeKeyForSegments", () => {
  it("parses literal, dynamic and catch-all segments", () => {
    expect(parseRouteSegments("/users/:id/edit")).toEqual([
      { kind: "literal", name: "users" },
      { kind: "param", name: "id" },
      { kind: "literal", name: "edit" },
    ]);
    expect(parseRouteSegments("/docs/*slug")).toEqual([
      { kind: "literal", name: "docs" },
      { kind: "catch", name: "slug" },
    ]);
    expect(parseRouteSegments("/users/$id")).toEqual([
      { kind: "literal", name: "users" },
      { kind: "param", name: "id" },
    ]);
  });

  it("builds uppercase keys from path segments", () => {
    expect(routeKeyForSegments([])).toBe("HOME");
    expect(routeKeyForSegments(parseRouteSegments("/about"))).toBe("ABOUT");
    expect(routeKeyForSegments(parseRouteSegments("/users/:id/edit"))).toBe("USERS_ID_EDIT");
    expect(routeKeyForSegments(parseRouteSegments("/docs/*slug"))).toBe("DOCS_SLUG");
  });
});

describe("buildFileRegistry", () => {
  it("assigns unique identifiers", () => {
    const config = makeConfig();
    const tree = scanDirectory(config.pages, config);
    const registry = buildFileRegistry(tree);
    const ids = [...registry.fileToId.values()];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("importSpecifier", () => {
  it("computes relative specifiers from the output file", () => {
    const config = makeConfig();
    const file = join(dir, "pages", "about.tsx");
    expect(importSpecifier(file, config)).toBe("../pages/about");
  });

  it("uses the alias prefix when configured", () => {
    const config = { ...makeConfig(), importPrefix: "@/pages" };
    const file = join(dir, "pages", "about.tsx");
    expect(importSpecifier(file, config)).toBe("@/pages/about");
  });
});

describe("generateRoutesModule", () => {
  it("emits imports, routes and routesMeta for react-router", () => {
    const config = makeConfig();
    const source = generateRoutesModule(config);

    expect(source).toContain('from "react-fs-router/adapters/react-router"');
    expect(source).toContain('path: "/about"');
    expect(source).toContain("export const routesMeta");
    expect(source).toContain("export default function Router");
  });

  it("emits a custom render component for non-react-router adapters", () => {
    const config = makeConfig("custom");
    const source = generateRoutesModule(config);

    expect(source).toContain("renderRoutes");
    expect(source).not.toContain("react-fs-router/adapters/react-router");
  });

  it("includes the ignore identifier in routingMeta", () => {
    const config = makeConfig();
    const source = generateRoutesModule(config);

    expect(source).toContain("export const routingMeta");
    expect(source).toContain('"ignorePrefix": "_"');
    expect(source).toContain('"adapter": "react-router"');
  });

  it("emits a standalone ignoreIdentifier for the default ignore prefix", () => {
    const config = makeConfig();
    const source = generateRoutesModule(config);

    expect(source).toContain('export const ignoreIdentifier = "_";');
  });

  it("emits a standalone ignoreIdentifier reflecting a custom prefix", () => {
    const config = { ...makeConfig(), ignorePrefix: "$" };
    const source = generateRoutesModule(config);

    expect(source).toContain('export const ignoreIdentifier = "$";');
    expect(source).toContain('"ignorePrefix": "$"');
  });

  it("emits a ROUTES navigation map with constants and dynamic builders", () => {
    const config = makeConfig();
    mkdirSync(join(dir, "pages", "docs"), { recursive: true });
    writeFileSync(join(dir, "pages", "users", "[id].tsx"), "export default function User() {}");
    writeFileSync(join(dir, "pages", "docs", "[...slug].tsx"), "export default function Doc() {}");
    const source = generateRoutesModule(config);

    expect(source).toContain("export const ROUTES = {");
    expect(source).toContain('"HOME": "/"');
    expect(source).toContain('"ABOUT": "/about"');
    expect(source).toContain('"USERS": "/users"');
    expect(source).toContain('"USERS_ID": (id) => `/users/${id}`');
    expect(source).toContain("\"DOCS_SLUG\": (...slug) => `/docs/${slug.join('/')}`");
  });

  it("emits loader imports, route entries and routeObjects", () => {
    mkdirSync(join(dir, "pages", "users"), { recursive: true });
    writeFileSync(join(dir, "pages", "users", "loader.ts"), "export const loader = () => ({})");
    const config = makeConfig();
    const source = generateRoutesModule(config);

    expect(source).toContain("users/loader");
    expect(source).toContain('"loader": loader');
    expect(source).toContain("export const routeObjects = toDataRouterObjects(resolveRoutes(routes, true));");
  });

  it("emits inheritLayout into routingMeta and routeObjects", () => {
    const config = { ...makeConfig(), inheritLayout: false };
    const source = generateRoutesModule(config);

    expect(source).toContain('"inheritLayout": false');
    expect(source).toContain("export const routeObjects = toDataRouterObjects(resolveRoutes(routes, false));");
  });

  it("emits the data router adapter by default", () => {
    const config = makeConfig();
    const source = generateRoutesModule(config);

    expect(source).toContain("reactRouterDataAdapter");
    expect(source).toContain("toDataRouterObjects");
    expect(source).not.toContain("reactRouterAdapter");
  });

  it("opts into the legacy browser router component", () => {
    const config = { ...makeConfig(), legacyBrowserRouter: true };
    const source = generateRoutesModule(config);

    expect(source).toContain("reactRouterAdapter");
    expect(source).toContain("toRouteObjects");
    expect(source).not.toContain("reactRouterDataAdapter");
    expect(source).toContain('"legacyBrowserRouter": true');
    expect(source).toContain("export const routeObjects = toRouteObjects(resolveRoutes(routes, true));");
  });

  it("emits the tanstack adapter, routeTree and self-rendering Router", () => {
    const config = makeConfig("tanstack-router");
    const source = generateRoutesModule(config);

    expect(source).toContain('from "react-fs-router/adapters/tanstack"');
    expect(source).toContain("tanstackRouterAdapter");
    expect(source).toContain("toTanstackRouteTree");
    expect(source).toContain("export const routeTree = toTanstackRouteTree(resolveRoutes(routes, true));");
    expect(source).toContain("adapter={tanstackRouterAdapter}");
    expect(source).toContain("export default function Router");
    expect(source).not.toContain("react-fs-router/adapters/react-router");
  });

  it("emits inheritLayout into the tanstack routeTree", () => {
    const config = { ...makeConfig("tanstack-router"), inheritLayout: false };
    const source = generateRoutesModule(config);

    expect(source).toContain("export const routeTree = toTanstackRouteTree(resolveRoutes(routes, false));");
  });

  it("emits imports through an import alias when importPrefix is set", () => {
    const config = { ...makeConfig(), importPrefix: "@/pages" };
    const source = generateRoutesModule(config);

    expect(source).toContain('from "@/pages/about"');
    expect(source).not.toContain('from "../pages/about"');
  });

  it("deduplicates import identifiers for files with the same base name", () => {
    const config = makeConfig();
    mkdirSync(join(dir, "pages", "admin"), { recursive: true });
    writeFileSync(join(dir, "pages", "about.tsx"), "export default function A() {}");
    writeFileSync(join(dir, "pages", "admin", "about.tsx"), "export default function B() {}");
    const source = generateRoutesModule(config);

    expect(source).toContain('from "../pages/about"');
    expect(source).toContain('from "../pages/admin/about"');
    const ids = [...source.matchAll(/import (about\d*) from/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("emits custom function files as wrapper references, not routes", () => {
    mkdirSync(join(dir, "pages", "account"), { recursive: true });
    writeFileSync(join(dir, "pages", "account", "index.tsx"), "export default function Account() {}");
    writeFileSync(join(dir, "pages", "account", "guard.tsx"), "export default function Guard() {}");
    const config = resolveConfig(
      {
        pages: join(dir, "pages"),
        outDir: join(dir, "out"),
        functions: { layout: "layout", loading: "loading", error: "error", guard: "guard" },
      },
      dir,
    );
    const source = generateRoutesModule(config);

    expect(source).toContain('from "../pages/account/guard"');
    expect(source).toContain('"guard": guard');
    expect(source).not.toContain('"/account/guard"');
  });

  it("emits a single ROUTES entry when sanitized keys collide", () => {
    const config = makeConfig();
    writeFileSync(join(dir, "pages", "my-page.tsx"), "export default function A() {}");
    writeFileSync(join(dir, "pages", "my_page.tsx"), "export default function B() {}");
    const source = generateRoutesModule(config);

    // Both routes exist, but the ROUTES map contains the sanitized key once.
    expect(source).toContain('path: "/my-page"');
    expect(source).toContain('path: "/my_page"');
    const keys = source.match(/"MY_PAGE":/g) ?? [];
    expect(keys).toHaveLength(1);
    expect(source).toMatch(/"MY_PAGE": "\/my_/);
  });
});
