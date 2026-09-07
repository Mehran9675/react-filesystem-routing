#!/usr/bin/env node
import { Command } from "commander";
import { watch } from "chokidar";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig, resolveConfig } from "./config.js";
import { writeRoutes } from "./generator.js";
import type { UserConfig } from "./types.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = new Command();
  program
    .name("rfr")
    .version(pkg.version, "-v, --version", "Output the current version")
    .option("-i, --input <directory>", "Path to the pages directory (overrides config)")
    .option("-c, --config <file>", "Path to the config file", "rfr.config.ts")
    .option("-o, --output <directory>", "Output directory (overrides config)")
    .option("-a, --adapter <name>", "Routing adapter to use")
    .option("-w, --watch", "Watch for changes and regenerate")
    .option("-b, --build", "Generate once and exit (default)")
    .parse(argv);

  const opts = program.opts<{
    input?: string;
    config: string;
    output?: string;
    adapter?: string;
    watch?: boolean;
    build?: boolean;
  }>();

  const userConfig: UserConfig = existsSync(opts.config)
    ? await loadConfig(opts.config)
    : {};

  const merged: UserConfig = {
    ...userConfig,
    pages: opts.input ?? userConfig.pages,
    outDir: opts.output ?? userConfig.outDir,
    adapter: opts.adapter ?? userConfig.adapter,
  };

  const config = resolveConfig(merged, process.cwd());
  writeRoutes(config);
  console.log(`[react-fs-router] Generated ${config.outFile}`);

  if (opts.watch) {
    const watcher = watch(config.pages, { ignored: /(^|[\/\\])\../ });
    const regenerate = (): void => {
      try {
        writeRoutes(config);
        console.log(`[react-fs-router] Regenerated ${config.outFile}`);
      } catch (err) {
        console.error("[react-fs-router]", err);
      }
    };
    watcher.on("add", regenerate).on("change", regenerate).on("unlink", regenerate);
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("[react-fs-router]", err);
    process.exitCode = 1;
  });
}
