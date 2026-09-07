import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "./config.js";
import { scanDirectory } from "./tree.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rfr-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeTree(): void {
  mkdirSync(join(dir, "pages", "users"), { recursive: true });
  writeFileSync(join(dir, "pages", "layout.tsx"), "export default function RootLayout() {}");
  writeFileSync(join(dir, "pages", "index.tsx"), "export default function Home() {}");
  writeFileSync(join(dir, "pages", "about.tsx"), "export default function About() {}");
  writeFileSync(join(dir, "pages", "_private.tsx"), "export default function Private() {}");
  writeFileSync(join(dir, "pages", "users", "layout.tsx"), "export default function UsersLayout() {}");
  writeFileSync(join(dir, "pages", "users", "index.tsx"), "export default function Users() {}");
  writeFileSync(join(dir, "pages", "users", "[id].tsx"), "export default function User() {}");
}

describe("scanDirectory", () => {
  it("builds the route tree with folders, index, layout, params and ignore rules", () => {
    makeTree();
    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    const tree = scanDirectory(config.pages, config);

    expect(tree).toHaveLength(1);
    const root = tree[0];
    expect(root.type).toBe("directory");
    expect(root.path).toBe("/");
    expect(root.component).toContain("index.tsx");
    expect(root.layout).toContain("layout.tsx");

    const children = root.children;

    const aboutLeaf = children.find((c) => c.path === "/about" && c.type === "file");
    expect(aboutLeaf?.component).toContain("about.tsx");

    const users = children.find((c) => c.path === "/users");
    expect(users?.type).toBe("directory");
    expect(users?.layout).toContain("layout.tsx");
    expect(users?.component).toContain("index.tsx");
    expect(users?.children).toHaveLength(1);
    expect(users?.children[0].path).toBe("/users/:id");

    // Underscore-prefixed files are ignored.
    expect(JSON.stringify(tree)).not.toContain("_private");
  });

  it("returns top-level routes when the root has no layout/index/functions", () => {
    mkdirSync(join(dir, "pages"), { recursive: true });
    writeFileSync(join(dir, "pages", "a.tsx"), "x");
    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    const tree = scanDirectory(config.pages, config);

    expect(tree).toHaveLength(1);
    expect(tree[0].path).toBe("/a");
  });

  it("honors a configurable ignore prefix", () => {
    mkdirSync(join(dir, "pages"), { recursive: true });
    writeFileSync(join(dir, "pages", "_private.tsx"), "x");
    writeFileSync(join(dir, "pages", "about.tsx"), "x");

    const config = resolveConfig({ pages: join(dir, "pages"), ignorePrefix: "$" }, dir);
    const tree = scanDirectory(config.pages, config);
    const paths = tree.map((n) => n.path);

    // With a "$" prefix, "_private" is no longer ignored.
    expect(paths).toContain("/_private");
    expect(paths).toContain("/about");
  });

  it("formats dynamic segments using the adapter formatter", () => {
    mkdirSync(join(dir, "pages", "users"), { recursive: true });
    writeFileSync(join(dir, "pages", "users", "[id].tsx"), "x");

    const config = resolveConfig({ pages: join(dir, "pages"), adapter: "tanstack-router" }, dir);
    const tree = scanDirectory(config.pages, config);

    const users = tree.find((n) => n.path === "/users");
    expect(users?.children[0].path).toBe("/users/$id");
  });

  it("detects loader/action files as data functions, not routes", () => {
    mkdirSync(join(dir, "pages", "users"), { recursive: true });
    writeFileSync(join(dir, "pages", "users", "index.tsx"), "x");
    writeFileSync(join(dir, "pages", "users", "loader.ts"), "export const loader = () => ({})");
    writeFileSync(join(dir, "pages", "users", "action.ts"), "export const action = () => null");

    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    const tree = scanDirectory(config.pages, config);

    const users = tree.find((n) => n.path === "/users");
    expect(users?.loaders.loader).toContain("loader.ts");
    expect(users?.loaders.action).toContain("action.ts");
    // Loader/action files must not become child routes.
    expect(users?.children).toEqual([]);
  });

  it("does not scan the generated routes module itself", () => {
    mkdirSync(join(dir, "pages"), { recursive: true });
    writeFileSync(join(dir, "pages", "about.tsx"), "x");
    writeFileSync(join(dir, "pages", "routes.tsx"), "export default function Generated() {}");

    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    const tree = scanDirectory(config.pages, config);
    const paths = tree.map((n) => n.path);

    expect(paths).toContain("/about");
    expect(paths).not.toContain("/routes");
  });

  it("ignores directories via the prefix, dot rules and the ignore list", () => {
    mkdirSync(join(dir, "pages", "_components"), { recursive: true });
    mkdirSync(join(dir, "pages", ".hidden"), { recursive: true });
    mkdirSync(join(dir, "pages", "helpers"), { recursive: true });
    writeFileSync(join(dir, "pages", "_components", "x.tsx"), "x");
    writeFileSync(join(dir, "pages", ".hidden", "a.tsx"), "x");
    writeFileSync(join(dir, "pages", "helpers", "b.tsx"), "x");
    writeFileSync(join(dir, "pages", "about.tsx"), "x");

    const config = resolveConfig({ pages: join(dir, "pages"), ignore: ["helpers"] }, dir);
    const json = JSON.stringify(scanDirectory(config.pages, config));

    expect(json).not.toContain("_components");
    expect(json).not.toContain(".hidden");
    expect(json).not.toContain("helpers");
    expect(json).toContain("about");
  });

  it("builds nested routes from dynamic segment directories", () => {
    mkdirSync(join(dir, "pages", "users", "[id]"), { recursive: true });
    writeFileSync(join(dir, "pages", "users", "[id]", "index.tsx"), "x");

    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    const tree = scanDirectory(config.pages, config);
    const users = tree.find((n) => n.path === "/users");
    const dynamic = users?.children.find((n) => n.path === "/users/:id");

    expect(dynamic?.type).toBe("directory");
    expect(dynamic?.component).toContain("index.tsx");
  });

  it("treats custom function files as wrappers, not routes", () => {
    mkdirSync(join(dir, "pages", "account"), { recursive: true });
    writeFileSync(join(dir, "pages", "account", "index.tsx"), "x");
    writeFileSync(join(dir, "pages", "account", "guard.tsx"), "x");

    const config = resolveConfig(
      {
        pages: join(dir, "pages"),
        functions: { layout: "layout", loading: "loading", error: "error", guard: "guard" },
      },
      dir,
    );
    const tree = scanDirectory(config.pages, config);
    const account = tree.find((n) => n.path === "/account");

    expect(account?.functions.guard).toContain("guard.tsx");
    expect(JSON.stringify(tree)).not.toContain("/account/guard");
  });

  it("ignores unsupported file extensions", () => {
    mkdirSync(join(dir, "pages"), { recursive: true });
    writeFileSync(join(dir, "pages", "about.tsx"), "x");
    writeFileSync(join(dir, "pages", "styles.css"), "x");
    writeFileSync(join(dir, "pages", "logo.svg"), "x");

    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    const paths = scanDirectory(config.pages, config).map((n) => n.path);

    expect(paths).toContain("/about");
    expect(paths).not.toContain("/styles");
    expect(paths).not.toContain("/logo");
  });

  it("returns an empty tree when every entry is ignored", () => {
    mkdirSync(join(dir, "pages"), { recursive: true });
    writeFileSync(join(dir, "pages", "_private.tsx"), "x");

    const config = resolveConfig({ pages: join(dir, "pages") }, dir);
    expect(scanDirectory(config.pages, config)).toEqual([]);
  });
});
