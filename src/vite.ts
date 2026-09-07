import { watch } from "chokidar";
import type { Plugin, ViteDevServer } from "vite";
import { resolveConfig } from "./config.js";
import { writeRoutes } from "./generator.js";
import type { ResolvedConfig, UserConfig } from "./types.js";

export interface VitePluginOptions {
  /** Path to a config file (unused when `userConfig` is provided). */
  config?: string;
  /** Inline config, merged over defaults. */
  userConfig?: UserConfig;
}

/**
 * Vite plugin: generates the routes module on startup and on every change to
 * the pages directory. Import the generated file in your app as usual.
 */
export function reactFsRouter(options: VitePluginOptions = {}): Plugin {
  let resolved: ResolvedConfig | undefined;

  return {
    name: "react-fs-router",
    configResolved() {
      resolved = resolveConfig(options.userConfig ?? {}, process.cwd());
      writeRoutes(resolved);
    },
    buildStart() {
      if (resolved) writeRoutes(resolved);
    },
    configureServer(server: ViteDevServer) {
      if (!resolved) return;
      const current = resolved;
      const regenerate = (): void => {
        writeRoutes(current);
        server.ws.send({ type: "full-reload" });
      };
      const watcher = watch(current.pages, { ignored: /(^|[\/\\])\../ });
      watcher.on("add", regenerate).on("change", regenerate).on("unlink", regenerate);
    },
  };
}
