export interface RouteNode {
  /** Whether this node came from a single file ("file") or a directory ("directory"). */
  type: "file" | "directory";
  /** Full route path, e.g. "/about" or "/users/:id". */
  path: string;
  /** Absolute path to the route/index component file, or null. */
  component: string | null;
  /** Absolute path to the layout function file, or null. */
  layout: string | null;
  /** User-defined function files mapped by function name, e.g. { loading: "/abs/path.tsx" }. */
  functions: Record<string, string>;
  /** Data function files (loader, action, ...) mapped by name, e.g. { loader: "/abs/path.ts" }. */
  loaders: Record<string, string>;
  children: RouteNode[];
}

/** Serializable (no component references) route descriptor. */
export interface RouteMeta {
  type: "file" | "directory";
  path: string;
  component: string | null;
  layout: string | null;
  functions: Record<string, string>;
  loaders: Record<string, string>;
  children: RouteMeta[];
}

export type FileToFunction = (fileName: string) => string | null;

/** Formats dynamic path segments for a specific router. */
export interface PathFormatter {
  /** Format a dynamic segment, e.g. `[id]` -> `:id` (react-router) or `$id` (tanstack). */
  dynamic: (name: string) => string;
  /** Format a catch-all segment, e.g. `[...rest]` -> `*rest`. */
  catchAll: (name: string) => string;
}

export interface UserConfig {
  /** Directory to scan for routes. Default: "src/pages". */
  pages?: string;
  /** Directory to write generated files to. Default: the pages directory. */
  outDir?: string;
  /** Name of the generated routes file. Default: "routes.tsx". */
  outFileName?: string;
  /** Routing adapter to target. Default: "react-router". */
  adapter?: string;
  /**
   * Maps a file base name (without extension) to a function name, e.g.
   * { layout: "layout", loading: "loading", error: "error" }.
   * A file whose name maps to a function is treated as an add-on instead of a route.
   */
  functions?: Record<string, string> | FileToFunction;
  /**
   * Maps a file base name to a data function (loader, action, ...). These files
   * export a function attached to the route rather than a wrapper component.
   * Default: { loader: "loader", action: "action" }.
   */
  loaders?: Record<string, string> | FileToFunction;
  /** File extensions to treat as route/function files. */
  extensions?: string[];
  /** Prefix that marks a file/directory as ignored. Default: "_". Set to "" to disable. */
  ignorePrefix?: string;
  /** Whether dot-prefixed files/directories are ignored. Default: true. */
  ignoreDotFiles?: boolean;
  /** Extra file/directory names to ignore. */
  ignore?: string[];
  /** Optional import alias prefix, e.g. "@/pages" (replaces relative imports). */
  importPrefix?: string;
  /**
   * Whether a parent's layout cascades to descendants that do not define their
   * own layout. When a descendant defines its own layout, it always overrides
   * (replaces) the parent's layout. Default: true.
   */
  inheritLayout?: boolean;
  /**
   * Generate the legacy declarative React Router component (for use inside
   * `<BrowserRouter>`) instead of the default data-router route objects.
   * Default: false.
   */
  legacyBrowserRouter?: boolean;
  /** Customize dynamic segment formatting (defaults come from the selected adapter). */
  formatDynamicSegment?: (name: string) => string;
  /** Customize catch-all segment formatting (defaults come from the selected adapter). */
  formatCatchAllSegment?: (name: string) => string;
}

export interface ResolvedConfig {
  pages: string;
  outDir: string;
  outFile: string;
  adapter: string;
  fileToFunction: FileToFunction;
  fileToLoader: FileToFunction;
  extensions: string[];
  ignore: string[];
  ignorePrefix: string;
  ignoreDotFiles: boolean;
  inheritLayout: boolean;
  legacyBrowserRouter: boolean;
  pathFormatter: PathFormatter;
  importPrefix: string | null;
}
