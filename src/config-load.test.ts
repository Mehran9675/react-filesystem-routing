// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const dirs: string[] = [];

function writeConfig(name: string, body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "rfr-config-"));
  dirs.push(dir);
  const file = join(dir, name);
  writeFileSync(file, body, "utf8");
  return file;
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

describe("loadConfig", () => {
  it("loads a default export from an ESM config file", async () => {
    const file = writeConfig(
      "rfr.config.mjs",
      'export default { pages: "src/pages", adapter: "tanstack-router" };',
    );
    const config = await loadConfig(file);
    expect(config).toEqual({ pages: "src/pages", adapter: "tanstack-router" });
  });

  it("loads a named `config` export when there is no default export", async () => {
    const file = writeConfig(
      "rfr.config.mjs",
      'export const config = { pages: "custom/pages", ignorePrefix: "$" };',
    );
    const config = await loadConfig(file);
    expect(config).toEqual({ pages: "custom/pages", ignorePrefix: "$" });
  });

  it("throws when the module does not export a config object", async () => {
    const file = writeConfig("rfr.config.mjs", "export default 42;");
    await expect(loadConfig(file)).rejects.toThrow(/must export a config object/i);
  });
});
