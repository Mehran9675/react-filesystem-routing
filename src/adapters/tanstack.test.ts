import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { toTanstackRouteTree, tanstackRouterAdapter } from "./tanstack.js";
import type { ResolvedRoute } from "../render.js";

const Home = () => createElement("div", null, "Home");
const About = () => createElement("div", null, "About");
const User = () => createElement("div", null, "User 1");
const Docs = () => createElement("div", null, "Splat docs");

const HOME: ResolvedRoute = {
  path: "",
  index: true,
  element: createElement(Home),
  layout: null,
  loaders: {},
  children: [],
};

function renderAt(routes: ResolvedRoute[], entry: string) {
  const router = createRouter({
    routeTree: toTanstackRouteTree(routes),
    history: createMemoryHistory({ initialEntries: [entry] }),
  });
  render(createElement(RouterProvider, { router }));
}

describe("toTanstackRouteTree", () => {
  it("renders the matched static route", async () => {
    renderAt(
      [
        {
          path: "/",
          index: false,
          element: null,
          layout: null,
          loaders: {},
          children: [HOME, { path: "/about", index: false, element: createElement(About), layout: null, loaders: {}, children: [] }],
        },
      ],
      "/about",
    );

    expect(await screen.findByText("About")).toBeTruthy();
  });

  it("renders an index page for its directory", async () => {
    renderAt(
      [
        {
          path: "/",
          index: false,
          element: null,
          layout: null,
          loaders: {},
          children: [HOME],
        },
      ],
      "/",
    );

    expect(await screen.findByText("Home")).toBeTruthy();
  });

  it("renders dynamic and nested routes", async () => {
    renderAt(
      [
        {
          path: "/users",
          index: false,
          element: null,
          layout: null,
          loaders: {},
          children: [
            { path: "", index: true, element: createElement(Home), layout: null, loaders: {}, children: [] },
            { path: "/users/$id", index: false, element: createElement(User), layout: null, loaders: {}, children: [] },
          ],
        },
      ],
      "/users/1",
    );

    expect(await screen.findByText("User 1")).toBeTruthy();
  });

  it("converts splat segments to TanStack splat routes", async () => {
    renderAt(
      [
        {
          path: "/docs",
          index: false,
          element: null,
          layout: null,
          loaders: {},
          children: [{ path: "/docs/*slug", index: false, element: createElement(Docs), layout: null, loaders: {}, children: [] }],
        },
      ],
      "/docs/guides/intro",
    );

    expect(await screen.findByText("Splat docs")).toBeTruthy();
  });

  it("wraps route content with a layout route", async () => {
    const Layout = ({ children }: { children?: React.ReactNode }) =>
      createElement("div", { "data-testid": "layout" }, children);
    renderAt(
      [
        {
          path: "/users",
          index: false,
          element: null,
          layout: Layout as never,
          loaders: {},
          children: [HOME],
        },
      ],
      "/users",
    );

    expect(await screen.findByTestId("layout")).toBeTruthy();
    expect(await screen.findByText("Home")).toBeTruthy();
  });

  it("renders sibling top-level routes when there is no root entry", async () => {
    renderAt(
      [
        {
          path: "/users",
          index: false,
          element: null,
          layout: null,
          loaders: {},
          children: [HOME, { path: "/users/$id", index: false, element: createElement(User), layout: null, loaders: {}, children: [] }],
        },
        { path: "/about", index: false, element: createElement(About), layout: null, loaders: {}, children: [] },
      ],
      "/users/2",
    );

    expect(await screen.findByText("User 1")).toBeTruthy();
  });

  it("converts a root-level catch-all to a splat route", async () => {
    renderAt(
      [{ path: "/*slug", index: false, element: createElement(Docs), layout: null, loaders: {}, children: [] }],
      "/guides/intro",
    );

    expect(await screen.findByText("Splat docs")).toBeTruthy();
  });
});

describe("tanstackRouterAdapter", () => {
  it("renders the matched route through RouterProvider", async () => {
    const routes: ResolvedRoute[] = [
      {
        path: "/",
        index: false,
        element: null,
        layout: null,
        loaders: {},
        children: [HOME, { path: "/about", index: false, element: createElement(About), layout: null, loaders: {}, children: [] }],
      },
    ];
    render(createElement(tanstackRouterAdapter as never, { routes }));

    expect(await screen.findByText("Home")).toBeTruthy();
  });
});
