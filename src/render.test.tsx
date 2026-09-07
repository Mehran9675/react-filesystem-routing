import { describe, expect, it } from "vitest";
import { createElement, type ComponentType, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  FileSystemRouter,
  resolveRoute,
  resolveRoutes,
  wrapWithFunctions,
} from "./render.js";
import type { RouteEntry } from "./render.js";

const Home: ComponentType = () => <div>Home</div>;
const Loading: ComponentType<{ children?: ReactNode }> = ({ children }) => (
  <div data-testid="loading">{children}</div>
);
const RootLayout: ComponentType<{ children?: ReactNode }> = ({ children }) => (
  <div data-testid="root-layout">{children}</div>
);
const UsersLayout: ComponentType<{ children?: ReactNode }> = ({ children }) => (
  <div data-testid="users-layout">{children}</div>
);
const SettingsLayout: ComponentType<{ children?: ReactNode }> = ({ children }) => (
  <div data-testid="settings-layout">{children}</div>
);

describe("wrapWithFunctions", () => {
  it("wraps an element with function components", () => {
    const wrapped = wrapWithFunctions({ loading: Loading }, createElement(Home));
    const { container } = render(<>{wrapped}</>);
    expect(container.querySelector('[data-testid="loading"]')).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("returns null for a null element", () => {
    expect(wrapWithFunctions({ loading: Loading }, null)).toBeNull();
  });
});

describe("resolveRoute", () => {
  it("resolves a file route to an element", () => {
    const entry: RouteEntry = {
      type: "file",
      path: "/about",
      component: Home,
      layout: null,
      functions: {},
      loaders: {},
      children: [],
    };
    const resolved = resolveRoute(entry);
    expect(resolved.path).toBe("/about");
    expect(resolved.index).toBe(false);
    expect(resolved.element).toBeTruthy();
    expect(resolved.children).toHaveLength(0);
  });

  it("turns a directory component into an index child", () => {
    const entry: RouteEntry = {
      type: "directory",
      path: "/",
      component: Home,
      layout: null,
      functions: {},
      loaders: {},
      children: [],
    };
    const resolved = resolveRoute(entry);
    expect(resolved.element).toBeNull();
    expect(resolved.children).toHaveLength(1);
    expect(resolved.children[0].index).toBe(true);
    expect(resolved.children[0].path).toBe("");
  });
});

describe("resolveRoutes layout inheritance", () => {
  const entries: RouteEntry[] = [
    {
      type: "directory",
      path: "/",
      component: null,
      layout: RootLayout,
      functions: {},
      loaders: {},
      children: [
        { type: "file", path: "/about", component: Home, layout: null, functions: {}, loaders: {}, children: [] },
        {
          type: "directory",
          path: "/users",
          component: Home,
          layout: UsersLayout,
          functions: {},
          loaders: {},
          children: [
            { type: "file", path: "/users/:id", component: Home, layout: null, functions: {}, loaders: {}, children: [] },
            {
              type: "directory",
              path: "/users/settings",
              component: Home,
              layout: SettingsLayout,
              functions: {},
              loaders: {},
              children: [],
            },
          ],
        },
      ],
    },
  ];

  it("hoists a descendant with its own layout out of the parent layout (override)", () => {
    const resolved = resolveRoutes(entries);
    expect(resolved.map((r) => r.path)).toEqual(["/", "/users", "/users/settings"]);

    const root = resolved[0];
    expect(root.layout).toBe(RootLayout);
    expect(root.children.map((c) => c.path)).toEqual(["/about"]);

    const users = resolved[1];
    expect(users.layout).toBe(UsersLayout);
    expect(users.children.map((c) => c.path)).toEqual(["", "/users/:id"]);

    const settings = resolved[2];
    expect(settings.layout).toBe(SettingsLayout);
  });

  it("does not cascade a parent layout when inheritLayout is false", () => {
    const withIndex: RouteEntry[] = [
      {
        type: "directory",
        path: "/",
        component: Home,
        layout: RootLayout,
        functions: {},
        loaders: {},
        children: [
          { type: "file", path: "/about", component: Home, layout: null, functions: {}, loaders: {}, children: [] },
        ],
      },
    ];
    const resolved = resolveRoutes(withIndex, false);
    // The root still owns a page-covering layout, but it no longer wraps children.
    const root = resolved[0];
    expect(root.layout).toBeNull();

    // The index page is still wrapped by the root layout directly.
    const indexChild = root.children.find((c) => c.index);
    expect(indexChild).toBeTruthy();
    const { container } = render(<>{indexChild?.element}</>);
    expect(container.querySelector('[data-testid="root-layout"]')).toBeTruthy();
  });
});

describe("FileSystemRouter", () => {
  it("renders via a renderRoutes callback", () => {
    const routes: RouteEntry[] = [
      { type: "file", path: "/", component: Home, layout: null, functions: {}, loaders: {}, children: [] },
    ];
    const { container } = render(
      <FileSystemRouter
        routes={routes}
        renderRoutes={(resolved) => <div data-testid="custom">{resolved.length}</div>}
      />,
    );
    expect(container.querySelector('[data-testid="custom"]')?.textContent).toBe("1");
  });

  it("throws without an adapter or renderRoutes", () => {
    expect(() => FileSystemRouter({ routes: [] })).toThrow(/adapter|renderRoutes/);
  });
});

describe("resolveRoute functions and loaders", () => {
  it("wraps a file route's element with mapped functions", () => {
    const entry: RouteEntry = {
      type: "file",
      path: "/account",
      component: Home,
      layout: null,
      functions: { loading: Loading },
      loaders: {},
      children: [],
    };
    const resolved = resolveRoute(entry);
    const { container } = render(<>{resolved.element}</>);
    expect(container.querySelector('[data-testid="loading"]')).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("attaches directory loaders to the index child when there is an index", () => {
    const loader = () => ({});
    const entry: RouteEntry = {
      type: "directory",
      path: "/users",
      component: Home,
      layout: null,
      functions: {},
      loaders: { loader },
      children: [],
    };
    const resolved = resolveRoute(entry);
    expect(resolved.loaders).toEqual({});
    expect(resolved.children[0].index).toBe(true);
    expect(resolved.children[0].loaders.loader).toBe(loader);
  });

  it("keeps directory loaders on the group route when there is no index", () => {
    const loader = () => ({});
    const entry: RouteEntry = {
      type: "directory",
      path: "/users",
      component: null,
      layout: null,
      functions: {},
      loaders: { loader },
      children: [
        {
          type: "file",
          path: "/users/new",
          component: Home,
          layout: null,
          functions: {},
          loaders: {},
          children: [],
        },
      ],
    };
    const resolved = resolveRoute(entry);
    expect(resolved.loaders.loader).toBe(loader);
    expect(resolved.children.some((c) => c.index)).toBe(false);
  });
});

describe("FileSystemRouter adapter prop", () => {
  it("passes the resolved routes to an adapter component", () => {
    const routes: RouteEntry[] = [
      { type: "file", path: "/", component: Home, layout: null, functions: {}, loaders: {}, children: [] },
      { type: "file", path: "/about", component: Home, layout: null, functions: {}, loaders: {}, children: [] },
    ];
    const Adapter = ({ routes }: { routes: unknown[] }) => (
      <div data-testid="count">{routes.length}</div>
    );
    const { container } = render(<FileSystemRouter routes={routes} adapter={Adapter} />);
    expect(container.querySelector('[data-testid="count"]')?.textContent).toBe("2");
  });
});
