import { Fragment, createElement, type ComponentType, type ReactNode } from "react";

/** A route function component wraps a page (and optionally its children). */
export type RouteFunctionComponent = ComponentType<{ children?: ReactNode }>;

/** A route data function (loader, action, ...) attached to a route. */
export type RouteDataFunction = (...args: any[]) => any;

/** Runtime route descriptor with concrete component references. */
export interface RouteEntry {
  type: "file" | "directory";
  path: string;
  component: ComponentType | null;
  layout: RouteFunctionComponent | null;
  functions: Record<string, RouteFunctionComponent>;
  loaders: Record<string, RouteDataFunction>;
  children: RouteEntry[];
}

/** Router-agnostic composed route, ready for an adapter to render. */
export interface ResolvedRoute {
  path: string;
  index: boolean;
  /** The page element (already wrapped with functions), or null for a pure group route. */
  element: ReactNode | null;
  /** Layout wrapper component, applied by the adapter around child routes. */
  layout: RouteFunctionComponent | null;
  /** Data functions (loader, action, ...) attached to this route. */
  loaders: Record<string, RouteDataFunction>;
  children: ResolvedRoute[];
}

/** An adapter renders a resolved route tree into router-specific output. */
export type RouteAdapter = ComponentType<{ routes: ResolvedRoute[] }>;

/** Wrap an element with the given route functions (in insertion order). */
export function wrapWithFunctions(
  functions: Record<string, RouteFunctionComponent>,
  element: ReactNode | null,
): ReactNode | null {
  if (element === null || element === undefined) return null;
  return Object.entries(functions).reduce<ReactNode | null>(
    (acc, [name, Component]) => createElement(Component, { key: name }, acc),
    element,
  );
}

/** Internal result: a resolved route plus any layout-overriding descendants hoisted out. */
interface ResolveResult {
  route: ResolvedRoute;
  hoisted: ResolvedRoute[];
}

/** Wrap an element in a layout component, if one is provided. */
function wrapWithLayout(
  layout: RouteFunctionComponent | null,
  element: ReactNode | null,
): ReactNode | null {
  if (element === null || element === undefined) return null;
  return layout ? createElement(layout, null, element) : element;
}

function resolveEntry(
  entry: RouteEntry,
  inheritLayout: boolean,
  inheritedLayout: RouteFunctionComponent | null,
): ResolveResult {
  if (entry.type === "file") {
    return {
      route: {
        path: entry.path,
        index: false,
        element: wrapWithFunctions(
          entry.functions,
          entry.component ? createElement(entry.component) : null,
        ),
        layout: entry.layout,
        loaders: entry.loaders,
        children: [],
      },
      hoisted: [],
    };
  }

  const ownLayout = entry.layout;
  // The layout that wraps this directory's own page (and, when inheritance is
  // enabled, its non-overriding descendants).
  const effectiveLayout = ownLayout ?? (inheritLayout ? inheritedLayout : null);

  const nested: ResolvedRoute[] = [];
  const hoisted: ResolvedRoute[] = [];

  for (const child of entry.children) {
    const result = resolveEntry(child, inheritLayout, effectiveLayout);
    // A descendant directory that defines its own layout overrides the current
    // directory's layout, so it escapes the layout wrapper by becoming a sibling.
    if (inheritLayout && result.route.layout !== null && effectiveLayout !== null) {
      hoisted.push(result.route, ...result.hoisted);
    } else {
      nested.push(result.route);
      hoisted.push(...result.hoisted);
    }
  }

  const indexElement = entry.component
    ? wrapWithFunctions(entry.functions, createElement(entry.component))
    : null;

  // When inheritance is enabled this directory's layout wraps its children via
  // an outlet; otherwise the layout only wraps its own index page.
  const wrapsChildren = inheritLayout && ownLayout !== null;

  const indexChild: ResolvedRoute | null = indexElement
    ? {
        path: "",
        index: true,
        element: wrapsChildren ? indexElement : wrapWithLayout(ownLayout, indexElement),
        layout: null,
        loaders: entry.loaders,
        children: [],
      }
    : null;

  return {
    route: {
      path: entry.path,
      index: false,
      element: null,
      layout: wrapsChildren ? ownLayout : null,
      loaders: indexChild ? {} : entry.loaders,
      children: indexChild ? [indexChild, ...nested] : nested,
    },
    hoisted,
  };
}

/** Compose a single route entry into a router-agnostic resolved route. */
export function resolveRoute(entry: RouteEntry, inheritLayout = true): ResolvedRoute {
  return resolveEntry(entry, inheritLayout, null).route;
}

/** Compose a list of route entries into resolved routes. */
export function resolveRoutes(entries: RouteEntry[], inheritLayout = true): ResolvedRoute[] {
  const resolved: ResolvedRoute[] = [];
  for (const entry of entries) {
    const result = resolveEntry(entry, inheritLayout, null);
    resolved.push(result.route, ...result.hoisted);
  }
  return resolved;
}

export interface FileSystemRouterProps {
  routes: RouteEntry[];
  adapter?: RouteAdapter;
  renderRoutes?: (routes: ResolvedRoute[]) => ReactNode;
  /** Whether parent layouts cascade to layout-less descendants. Default: true. */
  inheritLayout?: boolean;
}

/**
 * The single component users drop into their routing solution. It resolves the
 * route tree and hands it to the configured adapter (or a custom `renderRoutes`
 * callback for any other toolchain).
 */
export function FileSystemRouter({
  routes,
  adapter: Adapter,
  renderRoutes,
  inheritLayout = true,
}: FileSystemRouterProps): ReactNode {
  const resolved = resolveRoutes(routes, inheritLayout);

  if (renderRoutes) return createElement(Fragment, null, renderRoutes(resolved));
  if (Adapter) return createElement(Adapter, { routes: resolved });

  throw new Error(
    "[react-fs-router] FileSystemRouter requires an `adapter` or a `renderRoutes` prop.",
  );
}
