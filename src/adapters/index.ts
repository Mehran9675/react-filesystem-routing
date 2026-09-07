import type { RouteAdapter } from "../render.js";

const registry = new Map<string, RouteAdapter>();

/** Register a user-defined routing adapter by id. */
export function defineAdapter(id: string, adapter: RouteAdapter): void {
  registry.set(id, adapter);
}

/** Look up a registered adapter by id. */
export function getAdapter(id: string): RouteAdapter | undefined {
  return registry.get(id);
}

/** Whether an adapter with the given id has been registered. */
export function hasAdapter(id: string): boolean {
  return registry.has(id);
}
