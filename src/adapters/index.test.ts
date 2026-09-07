import { describe, expect, it } from "vitest";
import { defineAdapter, getAdapter, hasAdapter } from "./index.js";
import type { RouteAdapter } from "../render.js";

const adapter: RouteAdapter = () => null;

describe("adapter registry", () => {
  it("registers and looks up adapters", () => {
    defineAdapter("test", adapter);
    expect(hasAdapter("test")).toBe(true);
    expect(getAdapter("test")).toBe(adapter);
    expect(hasAdapter("missing")).toBe(false);
    expect(getAdapter("missing")).toBeUndefined();
  });

  it("replaces an adapter registered under the same id", () => {
    const replacement: RouteAdapter = () => null;
    defineAdapter("replace", adapter);
    defineAdapter("replace", replacement);
    expect(getAdapter("replace")).toBe(replacement);
  });
});
