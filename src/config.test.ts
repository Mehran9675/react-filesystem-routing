import { isAbsolute, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FUNCTIONS,
  DEFAULT_LOADERS,
  defineConfig,
  resolveConfig,
  resolveFunctionMapper,
  resolveLoaderMapper,
  toAbsolute,
} from "./config.js";

describe("toAbsolute", () => {
  it("returns absolute paths unchanged", () => {
    const abs = resolve("some", "dir");
    expect(toAbsolute(abs, "anywhere")).toBe(abs);
    expect(isAbsolute(toAbsolute(abs, "anywhere"))).toBe(true);
  });

  it("resolves relative paths against the base", () => {
    const base = resolve("base");
    expect(toAbsolute("src/pages", base)).toBe(join(base, "src", "pages"));
  });
});

describe("resolveFunctionMapper", () => {
  it("uses defaults when omitted", () => {
    const fn = resolveFunctionMapper(undefined);
    expect(fn("layout")).toBe("layout");
    expect(fn("about")).toBeNull();
  });

  it("accepts a custom record", () => {
    const fn = resolveFunctionMapper({ shell: "shell", loading: "loading" });
    expect(fn("shell")).toBe("shell");
    expect(fn("layout")).toBeNull();
  });

  it("accepts a function", () => {
    const fn = resolveFunctionMapper((name) => (name === "guard" ? "guard" : null));
    expect(fn("guard")).toBe("guard");
    expect(fn("layout")).toBeNull();
  });
});

describe("resolveLoaderMapper", () => {
  it("uses loader/action defaults when omitted", () => {
    const fn = resolveLoaderMapper(undefined);
    expect(fn("loader")).toBe("loader");
    expect(fn("action")).toBe("action");
    expect(fn("about")).toBeNull();
  });

  it("accepts a custom record", () => {
    const fn = resolveLoaderMapper({ data: "data", action: "action" });
    expect(fn("data")).toBe("data");
    expect(fn("action")).toBe("action");
    expect(fn("loader")).toBeNull();
  });
});

describe("resolveConfig", () => {
  it("applies defaults", () => {
    const cwd = resolve("cwd");
    const config = resolveConfig({}, cwd);

    expect(config.pages).toBe(join(cwd, "src", "pages"));
    expect(config.outFile).toBe(join(cwd, "src", "pages", "routes.tsx"));
    expect(config.adapter).toBe("react-router");
    expect(config.extensions).toEqual([".js", ".jsx", ".ts", ".tsx"]);
    expect(config.fileToFunction("layout")).toBe(DEFAULT_FUNCTIONS.layout);
    expect(config.fileToLoader("loader")).toBe(DEFAULT_LOADERS.loader);
    expect(config.ignorePrefix).toBe("_");
    expect(config.ignoreDotFiles).toBe(true);
    expect(config.inheritLayout).toBe(true);
    expect(config.legacyBrowserRouter).toBe(false);
    expect(config.pathFormatter.dynamic("id")).toBe(":id");
  });

  it("honors overrides", () => {
    const cwd = resolve("cwd");
    const config = resolveConfig(
      { pages: "pages", outDir: "out", outFileName: "r.tsx", adapter: "custom" },
      cwd,
    );
    expect(config.pages).toBe(join(cwd, "pages"));
    expect(config.outFile).toBe(join(cwd, "out", "r.tsx"));
    expect(config.adapter).toBe("custom");
  });

  it("uses adapter-specific default path formatters", () => {
    const cwd = resolve("cwd");
    const tanstack = resolveConfig({ adapter: "tanstack-router" }, cwd);
    expect(tanstack.pathFormatter.dynamic("id")).toBe("$id");
    expect(tanstack.pathFormatter.catchAll("rest")).toBe("*rest");
  });

  it("honors inheritLayout override", () => {
    const cwd = resolve("cwd");
    const config = resolveConfig({ inheritLayout: false }, cwd);
    expect(config.inheritLayout).toBe(false);
  });

  it("honors legacyBrowserRouter override", () => {
    const cwd = resolve("cwd");
    const config = resolveConfig({ legacyBrowserRouter: true }, cwd);
    expect(config.legacyBrowserRouter).toBe(true);
  });

  it("honors ignore and formatter overrides", () => {
    const cwd = resolve("cwd");
    const config = resolveConfig(
      {
        ignorePrefix: "$",
        ignoreDotFiles: false,
        formatDynamicSegment: (n) => `{${n}}`,
        formatCatchAllSegment: (n) => `{...${n}}`,
      },
      cwd,
    );
    expect(config.ignorePrefix).toBe("$");
    expect(config.ignoreDotFiles).toBe(false);
    expect(config.pathFormatter.dynamic("id")).toBe("{id}");
    expect(config.pathFormatter.catchAll("rest")).toBe("{...rest}");
  });

  it("defaults importPrefix to null and honors a custom prefix", () => {
    const cwd = resolve("cwd");
    expect(resolveConfig({}, cwd).importPrefix).toBeNull();
    expect(resolveConfig({ importPrefix: "@/pages" }, cwd).importPrefix).toBe("@/pages");
  });
});

describe("defineConfig", () => {
  it("returns the config object unchanged (identity helper)", () => {
    const config = { pages: "src/pages", adapter: "tanstack-router" };
    expect(defineConfig(config)).toBe(config);
  });
});
