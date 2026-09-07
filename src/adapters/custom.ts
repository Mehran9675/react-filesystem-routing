import { Fragment, createElement, type ReactNode } from "react";
import type { ResolvedRoute, RouteAdapter } from "../render.js";

export type CustomRender = (routes: ResolvedRoute[]) => ReactNode;

/**
 * Build an adapter for any custom routing solution. The provided render
 * function receives the resolved route tree and returns router-specific output.
 */
export function createCustomAdapter(render: CustomRender): RouteAdapter {
  return function CustomAdapter({ routes }) {
    return createElement(Fragment, null, render(routes));
  };
}
