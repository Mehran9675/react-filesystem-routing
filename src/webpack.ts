import { watch } from "chokidar";
import { resolveConfig } from "./config.js";
import { writeRoutes } from "./generator.js";
import type { UserConfig } from "./types.js";

export interface WebpackPluginOptions {
  /** Path to a config file (unused when `userConfig` is provided). */
  config?: string;
  /** Inline config, merged over defaults. */
  userConfig?: UserConfig;
}

interface MinimalCompiler {
  hooks: {
    beforeRun: { tap: (name: string, fn: () => void) => void };
    watchRun: { tap: (name: string, fn: () => void) => void };
    watchClose: { tap: (name: string, fn: () => void) => void };
  };
}

/**
 * Webpack plugin: regenerates the routes module before each build/watch run
 * and whenever a page file changes.
 */
export class ReactFsRouterWebpackPlugin {
  private watcher?: ReturnType<typeof watch>;

  constructor(private options: WebpackPluginOptions = {}) {}

  apply(compiler: MinimalCompiler): void {
    const config = resolveConfig(this.options.userConfig ?? {}, process.cwd());
    const generate = (): void => {
      writeRoutes(config);
    };

    compiler.hooks.beforeRun.tap("ReactFsRouterWebpackPlugin", generate);
    compiler.hooks.watchRun.tap("ReactFsRouterWebpackPlugin", generate);
    compiler.hooks.watchClose.tap("ReactFsRouterWebpackPlugin", () => this.watcher?.close());

    this.watcher = watch(config.pages, { ignored: /(^|[\/\\])\../ });
    this.watcher.on("add", generate).on("change", generate).on("unlink", generate);
  }
}
