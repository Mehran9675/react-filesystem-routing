import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { FileToFunction, PathFormatter, ResolvedConfig, UserConfig } from "./types.js";

export const DEFAULT_FUNCTIONS: Record<string, string> = {
  layout: "layout",
  loading: "loading",
  error: "error",
};

/** Default data-function file names (attached to the route rather than rendered). */
export const DEFAULT_LOADERS: Record<string, string> = {
  loader: "loader",
  action: "action",
};

export const DEFAULT_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

export const BUILTIN_ADAPTERS = ["react-router", "custom", "tanstack-router"] as const;

/** Default dynamic-segment formatting per adapter. */
export const DEFAULT_PATH_FORMATTERS: Record<string, PathFormatter> = {
  "react-router": { dynamic: (name) => `:${name}`, catchAll: (name) => `*${name}` },
  "tanstack-router": { dynamic: (name) => `$${name}`, catchAll: (name) => `*${name}` },
  custom: { dynamic: (name) => `:${name}`, catchAll: (name) => `*${name}` },
};

/** Typed identity helper for config files (provides intellisense without changing values). */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

/** Resolve a possibly-relative path against a base directory. */
export function toAbsolute(path: string, base: string): string {
  return isAbsolute(path) ? path : resolve(base, path);
}

/** Normalize a user "functions" mapping into a callable file-name -> function-name mapper. */
export function resolveFunctionMapper(
  functions: Record<string, string> | FileToFunction | undefined,
): FileToFunction {
  if (typeof functions === "function") return functions;
  const map = functions ?? DEFAULT_FUNCTIONS;
  return (name: string) => map[name] ?? null;
}

/** Normalize a user "loaders" mapping into a callable file-name -> data-function-name mapper. */
export function resolveLoaderMapper(
  loaders: Record<string, string> | FileToFunction | undefined,
): FileToFunction {
  if (typeof loaders === "function") return loaders;
  const map = loaders ?? DEFAULT_LOADERS;
  return (name: string) => map[name] ?? null;
}

/** Merge user config with defaults and resolve all paths to absolute. */
export function resolveConfig(user: UserConfig = {}, cwd: string = process.cwd()): ResolvedConfig {
  const pages = toAbsolute(user.pages ?? "src/pages", cwd);
  const outDir = toAbsolute(user.outDir ?? pages, cwd);
  const adapter = user.adapter ?? "react-router";
  const defaultFormatter = DEFAULT_PATH_FORMATTERS[adapter] ?? DEFAULT_PATH_FORMATTERS["react-router"];

  return {
    pages,
    outDir,
    outFile: toAbsolute(user.outFileName ?? "routes.tsx", outDir),
    adapter,
    fileToFunction: resolveFunctionMapper(user.functions),
    fileToLoader: resolveLoaderMapper(user.loaders),
    extensions: user.extensions ?? DEFAULT_EXTENSIONS,
    ignore: user.ignore ?? [],
    ignorePrefix: user.ignorePrefix ?? "_",
    ignoreDotFiles: user.ignoreDotFiles ?? true,
    inheritLayout: user.inheritLayout ?? true,
    legacyBrowserRouter: user.legacyBrowserRouter ?? false,
    pathFormatter: {
      dynamic: user.formatDynamicSegment ?? defaultFormatter.dynamic,
      catchAll: user.formatCatchAllSegment ?? defaultFormatter.catchAll,
    },
    importPrefix: user.importPrefix ?? null,
  };
}

/**
 * Load a config module (.ts or .js). Supports `export default {...}` or a
 * named `export const config`. Requires Node >= 20.6 for native .ts loading.
 */
export async function loadConfig(configPath: string): Promise<UserConfig> {
  const mod = await import(pathToFileURL(resolve(configPath)).href);
  const namespace = mod as { default?: unknown; config?: unknown };
  const raw = namespace.default ?? namespace.config ?? mod;

  if (raw && typeof raw === "object") return raw as UserConfig;
  throw new Error(
    `Config file "${configPath}" must export a config object (default export or named "config").`,
  );
}
