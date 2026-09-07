import { createElement, useState } from "react";
import { Outlet, RouterProvider, createBrowserRouter, useRoutes } from "react-router";
import type { RouteObject } from "react-router";
import type { ResolvedRoute, RouteAdapter } from "../render.js";

/**
 * React Router v7 matches splats with a bare "*" segment (read back via
 * `params["*"]`); named forms like "*slug" no longer compile. Normalize any
 * adapter-formatted "*slug" segment (e.g. `/docs/*slug`) to "/*".
 */
function toReactRouterPath(path: string): string {
  return path
    .split("/")
    .map((segment) => (segment.startsWith("*") && segment !== "*" ? "*" : segment))
    .join("/");
}

/** Convert resolved routes into react-router `useRoutes` route objects. */
export function toRouteObjects(routes: ResolvedRoute[]): RouteObject[] {
  return routes.map((route): RouteObject => {
    const outlet = createElement(Outlet);
    const base = route.element ?? (route.children.length > 0 ? outlet : null);
    const element = route.layout ? createElement(route.layout, null, outlet) : base;
    const children = route.children.length > 0 ? toRouteObjects(route.children) : undefined;

    const loader = route.loaders.loader as RouteObject["loader"] | undefined;
    const action = route.loaders.action as RouteObject["action"] | undefined;

    if (route.index) {
      return { index: true, element: element ?? undefined, loader, action };
    }

    return {
      path: route.path ? toReactRouterPath(route.path) : undefined,
      element: element ?? undefined,
      children,
      loader,
      action,
    };
  });
}

/**
 * Convert resolved routes into route objects ready for a data router
 * (`createBrowserRouter`). Ensures a root route exists when needed.
 */
export function toDataRouterObjects(routes: ResolvedRoute[]): RouteObject[] {
  const objects = toRouteObjects(routes);
  if (objects.some((route) => route.path === "/")) return objects;
  return [{ path: "/", element: createElement(Outlet), children: objects }];
}

/** React Router adapter: renders the route tree via `useRoutes` (declarative). */
export const reactRouterAdapter: RouteAdapter = function ReactRouterAdapter({ routes }) {
  return useRoutes(toRouteObjects(routes));
};

/**
 * React Router data adapter: renders via `createBrowserRouter` + `RouterProvider`,
 * so route `loader`/`action` data functions are executed and exposed via
 * `useLoaderData()`/`useActionData()`.
 */
export const reactRouterDataAdapter: RouteAdapter = function ReactRouterDataAdapter({ routes }) {
  const [router] = useState(() => createBrowserRouter(toDataRouterObjects(routes)));
  return createElement(RouterProvider, { router });
};
