import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedConfig, RouteNode } from "./types.js";
import {
  isIgnoredName,
  isIndexName,
  isSupportedFile,
  parseFileName,
  toRouteSegment,
} from "./scanner.js";

/** Join a base route path with a segment, normalizing the leading slash. */
export function joinPath(base: string, segment: string): string {
  if (!base || base === "/") return "/" + segment;
  return base + "/" + segment;
}

/**
 * Recursively scan a pages directory and build the route tree.
 * Directories define hierarchy, index files define the directory's page,
 * layout (and other mapped functions) are attached as add-ons, and other
 * files become leaf routes.
 */
export function scanDirectory(pages: string, config: ResolvedConfig): RouteNode[] {
  return walk(pages, "", config);
}

function walk(dir: string, basePath: string, config: ResolvedConfig): RouteNode[] {
  const node: RouteNode = {
    type: "directory",
    path: basePath === "" ? "/" : basePath,
    component: null,
    layout: null,
    functions: {},
    loaders: {},
    children: [],
  };

  const entries = readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (isIgnoredName(entry.name, config)) continue;

    if (entry.isDirectory()) {
      const segment = toRouteSegment(entry.name, config.pathFormatter);
      node.children.push(...walk(join(dir, entry.name), joinPath(basePath, segment), config));
      continue;
    }

    if (!isSupportedFile(entry.name, config.extensions)) continue;

    const full = join(dir, entry.name);
    // Never scan the generated routes module itself (avoids self-imports).
    if (full === config.outFile) continue;
    const { name } = parseFileName(entry.name);
    const functionName = config.fileToFunction(name);
    const loaderName = config.fileToLoader(name);

    if (functionName === "layout") {
      node.layout = full;
    } else if (functionName) {
      node.functions[functionName] = full;
    } else if (loaderName) {
      node.loaders[loaderName] = full;
    } else if (isIndexName(name)) {
      node.component = full;
    } else {
      node.children.push({
        type: "file",
        path: joinPath(basePath, toRouteSegment(name, config.pathFormatter)),
        component: full,
        layout: null,
        functions: {},
        loaders: {},
        children: [],
      });
    }
  }

  if (basePath === "") {
    const rootHasContent =
      node.component !== null ||
      node.layout !== null ||
      Object.keys(node.functions).length > 0 ||
      Object.keys(node.loaders).length > 0;
    // A content-bearing root becomes a single wrapper route; otherwise we
    // return the top-level routes directly.
    return rootHasContent ? [node] : node.children;
  }

  return [node];
}
