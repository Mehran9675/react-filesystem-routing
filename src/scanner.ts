import type { PathFormatter } from "./types.js";

export interface ParsedFileName {
  /** Base name without extension, e.g. "index" or "[id]". */
  name: string;
  /** Extension including the leading dot, e.g. ".tsx" or "". */
  ext: string;
}

export interface IgnoreOptions {
  ignorePrefix: string;
  ignoreDotFiles: boolean;
  ignore: string[];
}

/** Split a file name into its base name and extension. */
export function parseFileName(fileName: string): ParsedFileName {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return { name: fileName, ext: "" };
  return { name: fileName.slice(0, dot), ext: fileName.slice(dot) };
}

/** Whether a file base name represents an index route. */
export function isIndexName(name: string): boolean {
  return name === "index";
}

/**
 * Convert a raw file/directory name into a route segment using the given
 * formatter. "[id]" -> formatter.dynamic("id"), "[...rest]" ->
 * formatter.catchAll("rest"), and anything else is passed through.
 */
export function toRouteSegment(name: string, formatter: PathFormatter): string {
  if (name.startsWith("[") && name.endsWith("]")) {
    const inner = name.slice(1, -1);
    if (inner.startsWith("...")) return formatter.catchAll(inner.slice(3));
    return formatter.dynamic(inner);
  }
  return name;
}

/** Whether a file/directory name should be skipped based on the ignore options. */
export function isIgnoredName(fileName: string, options: IgnoreOptions): boolean {
  if (options.ignorePrefix && fileName.startsWith(options.ignorePrefix)) return true;
  if (options.ignoreDotFiles && fileName.startsWith(".")) return true;
  return options.ignore.includes(fileName);
}

/** Whether a file has one of the supported extensions. */
export function isSupportedFile(fileName: string, extensions: string[]): boolean {
  return extensions.includes(parseFileName(fileName).ext);
}
