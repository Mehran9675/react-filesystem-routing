import { describe, expect, it } from "vitest";
import { createElement, type ComponentType, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, RouterProvider, createMemoryRouter, useLoaderData, useParams } from "react-router";
import {
  reactRouterAdapter as ReactRouterAdapter,
  reactRouterDataAdapter as ReactRouterDataAdapter,
  toDataRouterObjects,
  toRouteObjects,
} from "./react-router.js";
import { resolveRoute, resolveRoutes } from "../render.js";
import type { ResolvedRoute, RouteEntry } from "../render.js";

// React Router builds a `new Request(url, { signal })` when it runs a loader.
// In Vitest's jsdom environment `Request` is Node's (undici) while `AbortSignal`
// is jsdom's, so the mismatched realms make undici throw. Stub a minimal Request.
class TestRequest {
  url: string;
  method: string;
  signal: AbortSignal;
  constructor(url: string, init: { signal?: AbortSignal; method?: string } = {}) {
    this.url = url;
    this.method = init.method ?? "GET";
    this.signal = init.signal ?? new AbortController().signal;
  }
}
(globalThis as unknown as { Request: unknown }).Request = TestRequest;

const Home: ComponentType = () => <div>Home</div>;
const About: ComponentType = () => <div>About</div>;
const Layout: ComponentType<{ children?: ReactNode }> = ({ children }) => (
  <div data-testid="layout">{children}</div>
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
const UsersPage: ComponentType = () => <div>UsersPage</div>;
const UserPage: ComponentType = () => <div>UserPage</div>;
const SettingsPage: ComponentType = () => <div>SettingsPage</div>;

describe("toRouteObjects", () => {
  it("maps resolved routes to route objects", () => {
    const routes: ResolvedRoute[] = [
      { path: "/", index: false, element: createElement(Home), layout: null, loaders: {}, children: [] },
    ];
    const objects = toRouteObjects(routes);
    expect(objects).toHaveLength(1);
    expect(objects[0].path).toBe("/");
    expect(objects[0].element).toBeTruthy();
  });

  it("wraps a layout around an outlet", () => {
    const routes: ResolvedRoute[] = [
      {
        path: "/",
        index: false,
        element: null,
        layout: Layout,
        loaders: {},
        children: [
          { path: "", index: true, element: createElement(Home), layout: null, loaders: {}, children: [] },
        ],
      },
    ];
    const objects = toRouteObjects(routes);
    expect(objects[0].element).toBeTruthy();
    expect(objects[0].children).toHaveLength(1);
  });

  it("normalizes named splats to React Router's bare splat", () => {
    const routes: ResolvedRoute[] = [
      { path: "/docs/*slug", index: false, element: createElement(Home), layout: null, loaders: {}, children: [] },
      { path: "/*root", index: false, element: createElement(Home), layout: null, loaders: {}, children: [] },
    ];
    const objects = toRouteObjects(routes);
    expect(objects[0].path).toBe("/docs/*");
    expect(objects[1].path).toBe("/*");
  });
});

describe("reactRouterAdapter", () => {
  it("renders the matched leaf route", () => {
    const routes: ResolvedRoute[] = [
      { path: "/", index: false, element: createElement(Home), layout: null, loaders: {}, children: [] },
      { path: "/about", index: false, element: createElement(About), layout: null, loaders: {}, children: [] },
    ];

    render(
      <MemoryRouter initialEntries={["/about"]}>
        <ReactRouterAdapter routes={routes} />
      </MemoryRouter>,
    );
    expect(screen.getByText("About")).toBeTruthy();
  });

  it("renders an index child through a layout", () => {
    const routes: ResolvedRoute[] = [
      {
        path: "/",
        index: false,
        element: null,
        layout: Layout,
        loaders: {},
        children: [
          { path: "", index: true, element: createElement(Home), layout: null, loaders: {}, children: [] },
        ],
      },
    ];

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ReactRouterAdapter routes={routes} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("layout")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
  });

  it("applies a parent layout to layout-less descendants but not to descendants with their own layout", () => {
    const entries: RouteEntry[] = [
      {
        type: "directory",
        path: "/",
        component: null,
        layout: RootLayout,
        functions: {},
        loaders: {},
        children: [
          { type: "file", path: "/about", component: About, layout: null, functions: {}, loaders: {}, children: [] },
          {
            type: "directory",
            path: "/users",
            component: UsersPage,
            layout: UsersLayout,
            functions: {},
            loaders: {},
            children: [
              { type: "file", path: "/users/:id", component: UserPage, layout: null, functions: {}, loaders: {}, children: [] },
              {
                type: "directory",
                path: "/users/settings",
                component: SettingsPage,
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
    const routes = resolveRoutes(entries);

    const settingsView = render(
      <MemoryRouter initialEntries={["/users/settings"]}>
        <ReactRouterAdapter routes={routes} />
      </MemoryRouter>,
    );
    expect(screen.getByText("SettingsPage")).toBeTruthy();
    expect(screen.getByTestId("settings-layout")).toBeTruthy();
    expect(screen.queryByTestId("users-layout")).toBeNull();
    expect(screen.queryByTestId("root-layout")).toBeNull();

    settingsView.unmount();

    render(
      <MemoryRouter initialEntries={["/users/1"]}>
        <ReactRouterAdapter routes={routes} />
      </MemoryRouter>,
    );
    expect(screen.getByText("UserPage")).toBeTruthy();
    expect(screen.getByTestId("users-layout")).toBeTruthy();
    expect(screen.queryByTestId("root-layout")).toBeNull();
  });
});

describe("loaders", () => {
  it("attaches loader and action to route objects", () => {
    const loader = () => ({ n: 1 });
    const action = () => null;
    const routes: ResolvedRoute[] = [
      { path: "/", index: false, element: createElement(Home), layout: null, loaders: { loader, action }, children: [] },
    ];
    const objects = toRouteObjects(routes);
    expect(objects[0].loader).toBe(loader);
    expect(objects[0].action).toBe(action);
  });

  it("runs the loader and passes data via useLoaderData", async () => {
    const loader = () => ({ message: "from-loader" });
    const Page = () => {
      const data = useLoaderData() as { message: string };
      return <div>{data.message}</div>;
    };
    const routes: ResolvedRoute[] = [
      { path: "/", index: false, element: createElement(Page), layout: null, loaders: { loader }, children: [] },
    ];
    const router = createMemoryRouter(toDataRouterObjects(routes), { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("from-loader")).toBeTruthy();
  });

  it("runs a directory loader for its index page", async () => {
    const loader = () => ({ message: "dir-loader" });
    const Page = () => {
      const data = useLoaderData() as { message: string };
      return <div>{data.message}</div>;
    };
    const entry: RouteEntry = {
      type: "directory",
      path: "/users",
      component: Page,
      layout: null,
      functions: {},
      loaders: { loader },
      children: [],
    };
    const router = createMemoryRouter(toDataRouterObjects([resolveRoute(entry)]), {
      initialEntries: ["/users"],
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("dir-loader")).toBeTruthy();
  });

  it("renders via the data adapter", () => {
    const routes: ResolvedRoute[] = [
      { path: "/", index: false, element: createElement(Home), layout: null, loaders: {}, children: [] },
    ];
    render(<ReactRouterDataAdapter routes={routes} />);
    expect(screen.getByText("Home")).toBeTruthy();
  });
});

describe("path matching", () => {
  it("wraps non-root routes under a root outlet for the data router", () => {
    const routes: ResolvedRoute[] = [
      { path: "/users/:id", index: false, element: createElement(Home), layout: null, loaders: {}, children: [] },
    ];
    const objects = toDataRouterObjects(routes);
    expect(objects).toHaveLength(1);
    expect(objects[0].path).toBe("/");
    expect(objects[0].children).toHaveLength(1);
    expect(objects[0].children?.[0].path).toBe("/users/:id");
  });

  it("renders dynamic params through the adapter", () => {
    const UserPage = () => {
      const { id } = useParams();
      return <div>user-{id}</div>;
    };
    const routes: ResolvedRoute[] = [
      { path: "/users/:id", index: false, element: createElement(UserPage), layout: null, loaders: {}, children: [] },
    ];

    render(
      <MemoryRouter initialEntries={["/users/7"]}>
        <ReactRouterAdapter routes={routes} />
      </MemoryRouter>,
    );
    expect(screen.getByText("user-7")).toBeTruthy();
  });

  it("renders a catch-all route", () => {
    const DocPage: ComponentType = () => <div>DocPage</div>;
    const routes: ResolvedRoute[] = [
      { path: "/docs/*rest", index: false, element: createElement(DocPage), layout: null, loaders: {}, children: [] },
    ];

    render(
      <MemoryRouter initialEntries={["/docs/a/b"]}>
        <ReactRouterAdapter routes={routes} />
      </MemoryRouter>,
    );
    expect(screen.getByText("DocPage")).toBeTruthy();
  });

  it("passes params to loaders under the data router", async () => {
    const loader = ({ params }: { params: { id?: string } }) => ({ id: params.id });
    const Page = () => {
      const data = useLoaderData() as { id?: string };
      return <div>loaded-{data.id}</div>;
    };
    const entry: RouteEntry = {
      type: "file",
      path: "/users/:id",
      component: Page,
      layout: null,
      functions: {},
      loaders: { loader },
      children: [],
    };
    const router = createMemoryRouter(toDataRouterObjects([resolveRoute(entry)]), {
      initialEntries: ["/users/9"],
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("loaded-9")).toBeTruthy();
  });
});
