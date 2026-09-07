import { describe, expect, it } from "vitest";
import {
  isIgnoredName,
  isIndexName,
  isSupportedFile,
  parseFileName,
  toRouteSegment,
} from "./scanner.js";
import type { PathFormatter } from "./types.js";

const reactRouter: PathFormatter = {
  dynamic: (name) => ":" + name,
  catchAll: (name) => "*" + name,
};

const ignoreOpts = { ignorePrefix: "_", ignoreDotFiles: true, ignore: [] };

describe("parseFileName", () => {
  it("splits base name and extension", () => {
    expect(parseFileName("index.tsx")).toEqual({ name: "index", ext: ".tsx" });
    expect(parseFileName("[id].jsx")).toEqual({ name: "[id]", ext: ".jsx" });
    expect(parseFileName("noext")).toEqual({ name: "noext", ext: "" });
    expect(parseFileName(".gitignore")).toEqual({ name: ".gitignore", ext: "" });
  });
});

describe("isIndexName", () => {
  it("detects index files", () => {
    expect(isIndexName("index")).toBe(true);
    expect(isIndexName("about")).toBe(false);
  });
});

describe("toRouteSegment", () => {
  it("converts dynamic params and splats using the formatter", () => {
    expect(toRouteSegment("[id]", reactRouter)).toBe(":id");
    expect(toRouteSegment("[slug]", reactRouter)).toBe(":slug");
    expect(toRouteSegment("[...rest]", reactRouter)).toBe("*rest");
    expect(toRouteSegment("about", reactRouter)).toBe("about");
  });

  it("supports custom formatters", () => {
    const braces: PathFormatter = {
      dynamic: (n) => `{${n}}`,
      catchAll: (n) => `{...${n}}`,
    };
    expect(toRouteSegment("[id]", braces)).toBe("{id}");
    expect(toRouteSegment("[...rest]", braces)).toBe("{...rest}");
  });
});

describe("isIgnoredName", () => {
  it("ignores the prefix and dot files by default", () => {
    expect(isIgnoredName("_layout.tsx", ignoreOpts)).toBe(true);
    expect(isIgnoredName(".hidden", ignoreOpts)).toBe(true);
    expect(isIgnoredName("about.tsx", ignoreOpts)).toBe(false);
  });

  it("respects a custom prefix and the ignore list", () => {
    expect(isIgnoredName("$private.tsx", { ...ignoreOpts, ignorePrefix: "$" })).toBe(true);
    expect(isIgnoredName("_notIgnored.tsx", { ...ignoreOpts, ignorePrefix: "$" })).toBe(false);
    expect(isIgnoredName("ignored.tsx", { ...ignoreOpts, ignore: ["ignored.tsx"] })).toBe(true);
  });

  it("can disable prefix and dot ignoring", () => {
    const opts = { ignorePrefix: "", ignoreDotFiles: false, ignore: [] };
    expect(isIgnoredName("_x.tsx", opts)).toBe(false);
    expect(isIgnoredName(".x", opts)).toBe(false);
  });
});

describe("isSupportedFile", () => {
  it("checks extensions", () => {
    expect(isSupportedFile("a.tsx", [".tsx", ".ts"])).toBe(true);
    expect(isSupportedFile("a.css", [".tsx", ".ts"])).toBe(false);
  });
});
