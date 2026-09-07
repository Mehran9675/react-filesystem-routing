import { createElement, useState, type ReactNode } from "react";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { ResolvedRoute, RouteAdapter, RouteFunctionComponent } from "../render.js";

// TanStack's route tree type is deeply generic and derived from static route
// declarations. This adapter builds the tree at runtime from resolved routes,
// so the returned tree is intentionally loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TanstackRouteTree = any;

function LayoutOutlet({ layout }: { layout: RouteFunctionComponent }): ReactNode {
  return createElement(layout, null, createElement(Outlet));
}

/** The component a resolved route should render, or undefined for the default outlet. */
function routeComponent(node: ResolvedRoute): (() => ReactNode) | undefined {
  if (node.element != null) return () => node.element;
  if (node.layout) {
    return () => createElement(LayoutOutlet, { layout: node.layout as RouteFunctionComponent });
  }
  return undefined;
}

/** Compute a route's path relative to its parent (TanStack normalizes slashes). */
function relativePath(childPath: string, parentPath: string): string {
  if (!parentPath || parentPath === "/") return childPath.replace(/^\//, "");
  const prefix = parentPath.endsWith("/") ? parentPath : `${parentPath}/`;
  if (childPath.startsWith(prefix)) return childPath.slice(prefix.length);
  return childPath.replace(/^\//, "");
}

/** Convert adapter-formatted splat segments (`*slug`) into TanStack's `$`. */
function toTanstackPath(path: string): string {
  if (!path) return path;
  return path
    .split("/")
    .map((segment) => (segment.startsWith("*") ? "$" : segment))
    .join("/");
}

function buildRoute(parent: TanstackRouteTree, parentPath: string, node: ResolvedRoute): TanstackRouteTree {
  const route = createRoute({
    getParentRoute: () => parent,
    // Index routes use "/"; every other route gets its parent-relative path.
    path: node.index ? "/" : toTanstackPath(relativePath(node.path, parentPath)),
    component: routeComponent(node),
  });

  const ownPath = node.index ? parentPath : node.path;
  const children = node.children
    .filter((child) => !(child.index && child.element == null))
    .map((child) => buildRoute(route, ownPath, child));

  return children.length > 0 ? route.addChildren(children) : route;
}

/**
 * Convert resolved routes into a real TanStack Router route tree. The root
 * route is created from the resolved "/" entry (applying its layout); every
 * other resolved route is stitched into the tree with its parent via
 * `getParentRoute`/`addChildren`.
 */
export function toTanstackRouteTree(routes: ResolvedRoute[]): TanstackRouteTree {
  const rootEntry = routes.find((route) => !route.index && route.path === "/");
  const rootLayout = rootEntry?.layout ?? null;

  const rootRoute = rootLayout
    ? createRootRoute({
        component: () => createElement(LayoutOutlet, { layout: rootLayout as RouteFunctionComponent }),
      })
    : createRootRoute();

  const topLevel: ResolvedRoute[] = rootEntry
    ? [...rootEntry.children, ...routes.filter((route) => route !== rootEntry)]
    : routes;

  const children = topLevel.map((node) => buildRoute(rootRoute, "/", node));

  return rootRoute.addChildren(children);
}

/**
 * TanStack Router adapter: builds a router from the resolved routes and renders
 * it via `<RouterProvider>`, so the generated default component works without
 * manual route-tree wiring.
 */
export const tanstackRouterAdapter: RouteAdapter = function TanStackRouterAdapter({ routes }) {
  const [router] = useState(() => createRouter({ routeTree: toTanstackRouteTree(routes) }));
  return createElement(RouterProvider, { router });
};
