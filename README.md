# 🗺️ react-fs-router

> Config-driven, adapter-pluggable file-system routing for React.

Stop hand-writing route tables. Put a file in your pages folder, run the
generator, and boom 💥 — you have a route. `react-fs-router` scans a directory
of page files, builds a route tree for you, and writes out a single module that
plugs straight into your favorite routing solution — React Router, TanStack
Router, or whatever router you like.

The best part? **You stay in control.** The generated module is plain, readable
code that imports *your* files and exports the pieces you need. No runtime
magic, no hidden conventions.

---

## 📚 What's inside

- [Why would I use this?](#-why-would-i-use-this)
- [Installation](#-installation)
- [Quick start](#-quick-start)
- [How it works](#-how-it-works)
- [File conventions](#-file-conventions)
- [Dynamic segments & route syntax](#-dynamic-segments--route-syntax)
- [Layouts](#-layouts)
- [Data functions (`loader` / `action`)](#-data-functions-loader--action)
- [Custom function wrappers](#-custom-function-wrappers)
- [Generated output](#-generated-output)
- [The `ROUTES` navigation map](#-the-routes-navigation-map)
- [Router adapters](#-router-adapters)
- [CLI & plugins](#-cli--plugins)
---

## 🤔 Why would I use this?

Routing by filesystem is a lovely idea on paper, but most routers need you to
hand-write a matching route tree somewhere — and then keep it in sync forever.
`react-fs-router` flips that around:

- 📂 **Your files are the source of truth.** `pages/about.tsx` *is* `/about`.
- 🔌 **Bring your own router.** Works with React Router (default), TanStack
  Router, or any custom solution through small adapters.
- 🧩 **Composable wrappers.** `loading`, `error`, `guard`, `shell` — any file
  name can become a wrapper around your page instead of a page itself.
- 📦 **One generated module.** Imports everything, exports routes + a ready
  `Router` component you can drop into `main.tsx` in seconds.
- 🧭 **Typed-feeling navigation.** The generated `ROUTES` map gives you
  constants like `ROUTES.ABOUT` and dynamic builders like
  `ROUTES.USERS_ID(14)` — no more stringly-typed URLs scattered around.
- 🚧 **Sensible ignore rules.** Files starting with `_` (like `_private.tsx` or
  a `_components` folder) are never turned into routes — configurable, of
  course.
- ⚡ **Works with your toolchain.** Use the CLI, a Vite plugin, or a webpack
  plugin — including watch mode while you develop.

---

## 📦 Installation

```bash
npm install react-fs-router
```

Then install the router you plan to use. `react-fs-router` treats routers as
optional peers, so it never forces one on you.

### If you're using React Router (the default) 🧭

React Router v7+ — note that v7 merged `react-router-dom` into
`react-router`, so that's the package you want:

```bash
npm install react-router
```

### If you're using TanStack Router ⚡

```bash
npm install @tanstack/react-router
```

That's it. Each router package is an **optional** peer dependency — install
only the ones you actually use.

> 💡 **Tip:** If you load your config from a `.ts` file, you'll need Node
> **20.6 or later** (it uses native TypeScript loading). On older Node, write
> `rfr.config.js` instead.

---

## 🚀 Quick start

Let's build a tiny app together. This is the whole setup:

### 1. Create a config file

```ts
// rfr.config.ts
import { defineConfig } from "react-fs-router";

export default defineConfig({
  pages: "src/pages",        // 📂 where your page files live
  outDir: "src",             // 📤 where the generated file goes
  outFileName: "routes.tsx", // 📄 name of the generated file
});
```

Don't worry about the options yet — the defaults are sensible and everything is
explained below.

### 2. Write some pages 📝

```
src/pages/
├── index.tsx        →  /
├── about.tsx        →  /about
├── layout.tsx       →  wraps every page (renders your nav/header)
└── users/
    ├── index.tsx    →  /users
    └── [id].tsx     →  /users/:id
```

```tsx
// src/pages/about.tsx
export default function About() {
  return <h1>About us 🎉</h1>;
}
```

### 3. Generate 🪄

```bash
npx rfr
```

This scans `src/pages` and writes `src/routes.tsx`. Run it once, or use watch
mode while developing (`npx rfr --watch`).

### 4. Render 🖥️

The generated file has a default `Router` component that already wires up a
React Router data router. Just render it:

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client";
import Router from "./routes";

createRoot(document.getElementById("root")!).render(<Router />);
```

And you're live! 🎊 Navigate to `/about` and your page shows up. If you prefer
TanStack Router, only two lines change — jump to
[Router adapters](#-router-adapters) to see all the options.

---

## ⚙️ How it works

Under the hood there are just three steps:

1. **Scan** 🔎 — a file system walker reads your pages directory using the
   conventions you configure (file extensions, ignore rules, function names).
2. **Build a tree** 🌳 — files and folders become a route tree. Directories
   become groups, `index` files become their folder's page, `layout` files
   become wrappers, and so on.
3. **Generate** ✍️ — one module is written (default `routes.tsx`) that imports
   your pages/layouts/loaders and exports the pieces documented in
   [Generated output](#-generated-output).

The generator is fully deterministic: the same folder plus the same config
always produces the same file. If anything looks surprising, just open the
generated file — it's your code to read and tweak.

---

## 📁 File conventions

| File | Purpose |
| --- | --- |
| `index.tsx` | The page **for its folder**. `pages/index.tsx` → `/`. |
| `layout.tsx` | A **layout wrapper** for the folder. Must render an `<Outlet />` (or its `children`). |
| `loading.tsx`, `error.tsx`, or any mapped function | A **wrapper component**. Must render its `children`. |
| `loader.ts`, `action.ts` | **Data functions** attached to the route (export a function, not a component). |
| `about.tsx` | A **leaf route** → `/about`. |
| `users/[id].tsx` | A **dynamic segment** → `/users/:id` with React Router syntax. |
| `docs/[...slug].tsx` | A **catch-all segment** → `/docs/*slug` with React Router syntax. |

A few things worth knowing:

- A single page file is also a route path (`pages/about.tsx` → `/about`).
- Folders define hierarchy — **every directory under `pages` is a route path**.
- A folder's `index.tsx` is the route for the folder itself; other files inside
  become its children. You can have a page *and* children at the same URL — the
  `index` page renders at the folder's path while child routes render deeper.

### 🚫 Ignoring files

- Files and directories starting with `_` are ignored **by default**
  (`_private.tsx`, `_components`). The prefix is configurable via
  `ignorePrefix`; set it to `""` to disable ignoring entirely.
- Dot-prefixed files/directories (`.hidden`) are also ignored by default —
  turn that off with `ignoreDotFiles: false`.
- Ignore extra names with `ignore: ["helpers"]`.

The resolved prefix is exported from the generated module, so your app can
always read the actual "ignore marker" without guessing:

- `routingMeta` contains the full resolved settings (`ignorePrefix`, adapter,
  and friends).
- `ignoreIdentifier` is the standalone ignore prefix (`"_"` by default).

### 📋 Configuration reference

Create `rfr.config.ts` (or `.js`) at your project root. Here's every option
with a friendly explanation:

```ts
import { defineConfig } from "react-fs-router";

export default defineConfig({
  pages: "src/pages",        // directory to scan 📂
  outDir: "src",             // where to write the generated routes file 📤
  outFileName: "routes.tsx", // generated file name 📄
  adapter: "react-router",   // "react-router" | "tanstack-router" | "custom" 🔌

  // Map file names to wrapper functions. A file whose base name maps to a
  // function is treated as an add-on instead of a route.
  functions: {
    layout: "layout",
    loading: "loading",
    error: "error",
    // your own: guard: "guard"
  },

  // Map file names to data functions (loader, action, ...). These files export
  // a function that is attached to the route rather than a wrapper component.
  loaders: {
    loader: "loader",
    action: "action",
  },

  // Whether a parent's layout cascades to layout-less descendants. Default: true.
  inheritLayout: true,
  // Generate the legacy declarative <BrowserRouter> component instead of the
  // default data-router route objects. Default: false.
  legacyBrowserRouter: false,

  // Files/dirs starting with this prefix are ignored. Default: "_".
  ignorePrefix: "_",
  // Whether dot-prefixed files/dirs are ignored. Default: true.
  ignoreDotFiles: true,
  extensions: [".js", ".jsx", ".ts", ".tsx"],
  ignore: ["helpers"],
  importPrefix: "@/pages", // optional import alias (replaces relative imports)

  // Customize how dynamic/catch-all segments are rendered. Defaults come from
  // the selected adapter (react-router: `:id` / `*rest`, tanstack: `$id` / `*rest`).
  formatDynamicSegment: (name) => `:${name}`,
  formatCatchAllSegment: (name) => `*${name}`,
});
```

`functions` and `loaders` may also be **functions** returning a name or `null`
— handy for fancy rules:

```ts
export default {
  pages: "src/pages",
  functions: (fileName) => (fileName === "shell" ? "shell" : null),
};
```

> 💡 **Note:** `loaders`/`actions` only run in React Router's data-router mode
> (the default). The legacy `<BrowserRouter>` mode and the TanStack adapter
> don't translate them — see the adapter sections for details.

---

## 🔀 Dynamic segments & route syntax

Square brackets in file names mark *dynamic* data, and the path syntax adapts
to whatever router you selected:

| File | React Router | TanStack Router |
| --- | --- | --- |
| `pages/users/[id].tsx` | `/users/:id` | `/users/$id` |
| `pages/docs/[...slug].tsx` | `/docs/*slug` | `/docs/*slug` → `$` splat route |

Every dynamic segment becomes a **parameter** you can read inside your page
with the router's normal hooks (`useParams`, `useLoaderData`, and friends). For
TanStack, catch-alls are converted to TanStack's `$` splat route automatically
by the adapter — you don't need to think about it. 🎩

Want different syntax? Override it with `formatDynamicSegment` /
`formatCatchAllSegment` in your config.

---

## 🖼️ Layouts

A `layout` file wraps the folder's **child routes**. Think: header + footer +
sidebar that stays mounted while you navigate between the pages inside that
folder.

Child routes render through the layout's outlet, so **your layout must render
an `<Outlet />`** — or, equivalently, render its `children` prop (the library
passes the outlet element through as `children`):

```tsx
// pages/layout.tsx
import { Outlet } from "react-router";

export default function RootLayout() {
  return (
    <div>
      <header>My app 🧡</header>
      <Outlet /> {/* child routes render here */}
    </div>
  );
}
```

The same thing using `children`:

```tsx
export default function RootLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      <header>My app 🧡</header>
      {children}
    </div>
  );
}
```

If the layout never renders an outlet (or `children`), child pages will not
appear — so don't forget it! 😉

### 🪆 Layout inheritance

By default, a parent's layout **cascades** to descendants that don't define
their own layout. A descendant that *does* define its own layout replaces
(overrides) the parent's rather than nesting inside it.

Set `inheritLayout: false` to disable cascading — then a layout only wraps its
own `index` page and never its descendants.

---

## 🔋 Data functions (`loader` / `action`)

Files mapped in `loaders` export a plain **function** (not a component). They
are attached to the route's `loader`/`action` and executed by a React Router
data router. The result is available in the page via `useLoaderData()` /
`useActionData()` — perfect for data fetching with loading states:

```ts
// pages/users/loader.ts
export async function loader({ params }: { params: { id: string } }) {
  return { id: params.id };
}
```

```tsx
// pages/users/[id].tsx
import { useLoaderData } from "react-router";

export default function User() {
  const data = useLoaderData() as { id: string };
  return <div>{data.id}</div>;
}
```

A directory's `loader`/`action` is attached to its `index` page so
`useLoaderData()` works there. If the directory has no `index`, the data
functions are attached to the group route so they still run for child
navigations.

---

## 🧩 Custom function wrappers

The `functions` map turns file names into **wrapper components**. `layout`,
`loading`, and `error` are enabled by default; add names such as `guard` or
`shell`, and files like `pages/account/guard.tsx` are treated as wrappers
instead of routes.

### What a wrapper can do

- 🎨 Render surrounding UI — spinners, banners, error panels, or content chrome
  around the page.
- 🚪 **Gate access**: return `<Navigate to={ROUTES.LOGIN} replace />` (or
  `null`) instead of rendering `children` when a guard fails.
- 🧠 Provide context to the page, e.g.
  `<SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>`.
- 🧭 Observe navigation with hooks such as `useLocation()` / `useParams()` and
  change what it renders per location.
- 🛡️ Act as an error boundary (a class component) or suspense boundary by
  wrapping `children`.

Here's a classic auth guard:

```tsx
// pages/account/guard.tsx
// config: functions: { layout: "layout", guard: "guard" }
import { Navigate, useLocation } from "react-router";
import { ROUTES } from "./routes";

export default function Guard({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
```

### 📨 Props a wrapper receives

A wrapper receives exactly one prop: `children: ReactNode`. `children` is the
page element — or, when several wrappers exist on the same route, the page
already wrapped by the inner wrappers. A wrapper **must render `children`**
unless it intentionally replaces it (as the guard above does).

Wrappers do *not* receive route params, `request`, or `context`; read those
with hooks (`useParams`, `useLocation`, `useLoaderData`, ...) instead. And
remember: `loading.tsx`/`error.tsx` don't automatically react to router loading
or error state — they're ordinary wrappers. Use `useNavigation` /
`useRouteError` inside them to respond to those states.

### 🪢 Wrapper chain

Multiple mapped files for the same route nest as a **chain** around the page,
in scan order: the last file processed becomes the outermost wrapper. Each
wrapper only needs to render its `children`, so chains compose naturally.

### 🧱 Layouts vs wrappers

A `layout` also comes from the `functions` map, but it's special-cased: a
layout wraps the folder's *child routes* through an outlet and stays mounted
while you navigate between those children. A custom wrapper wraps a single
*page* (a directory `index` or a leaf file) only.

### 🔄 Lifecycle

1. In the default data-router mode, the router runs the route's
   `loader`/`action` before rendering (see data functions above).
2. When a route matches, React mounts the component tree from the outside in:
   parent layouts render first, each page renders inside its parent's outlet,
   and the page renders inside its wrapper chain — outermost layout →
   wrapper(s) → page.
3. A wrapper mounts together with the page it wraps and unmounts when you
   navigate away from that page. Per-page state (form input, scroll position,
   timers) belongs here and resets on leave. State that should survive
   navigation between sibling pages belongs in a `layout` or a context
   provider higher up.
4. Navigating between dynamic values of the same route (`/users/1` →
   `/users/2`) **re-renders** the same mounted component instead of remounting
   it, so write effects against `useParams()` / `useLocation()`. If you need a
   full remount per param change, wrap `children` in a keyed element from
   inside the wrapper, e.g.
   `<Fragment key={params.id}>{children}</Fragment>`.

> ⚠️ Wrappers render *inside* the layout's outlet, never before it — a wrapper
> cannot prevent its layout from rendering. To guard an entire subtree before
> any of its content shows, put the wrapper higher up the tree or in the root
> `layout`.

---

## 📦 Generated output

The generated file (default `routes.tsx`) exports:

- `routes` — the runtime route entries used by the component.
- `routeObjects` — (React Router only) resolved route objects with
  `loader`/`action` attached. In the default mode this is ready for
  `createBrowserRouter`; in legacy mode it is ready for `useRoutes`.
- `routeTree` — (TanStack Router only) the resolved TanStack Router route tree,
  ready for `createRouter`; the default `Router` component renders it.
- `routesMeta` — a serializable route tree (paths plus function/loader file
  specifiers).
- `routingMeta` — the resolved routing settings (adapter, `ignorePrefix`,
  `ignoreDotFiles`, `ignore`, `inheritLayout`, `legacyBrowserRouter`).
- `ignoreIdentifier` — the resolved ignore prefix (the leading character that
  marks a file as ignored; `"_"` by default).
- `ROUTES` — a navigation map of every addressable page path. Static paths are
  string constants; dynamic paths are functions that build the URL from their
  arguments (see below). 🧭
- A `default` export — the single `FileSystemRouter` component.

---

## 🧭 The `ROUTES` navigation map

Stop hard-coding URLs. Use `ROUTES` instead of stringly-typed paths for links
and programmatic navigation. Keys are the uppercase path segments joined with
`_`; the root index route is `HOME`. Dynamic segments (and their catch-alls)
become function arguments in path order:

| File | Generated entry |
| --- | --- |
| `pages/index.tsx` | `ROUTES.HOME === "/"` |
| `pages/about.tsx` | `ROUTES.ABOUT === "/about"` |
| `pages/users/index.tsx` | `ROUTES.USERS === "/users"` |
| `pages/users/[id].tsx` | `ROUTES.USERS_ID(14) === "/users/14"` |
| `pages/docs/[...slug].tsx` | `ROUTES.DOCS_SLUG("guides", "intro") === "/docs/guides/intro"` |

```tsx
import { Link } from "react-router";
import { ROUTES } from "./routes";

<Link to={ROUTES.USERS_ID(14)}>User 14</Link>;
```

Beautiful, type-safe-ish navigation with zero extra tooling. ✨

---

## 🔌 Router adapters

This is where `react-fs-router` shines: the *same* page folder can target
different routers, and the generated module changes accordingly.

### 🧭 React Router (default)

By default the generated module targets React Router's **data router** API. It
exports `routeObjects` — ready for `createBrowserRouter` — and a default
`Router` component that renders a data router directly. Loaders/actions work
out of the box. 🎉

```tsx
// main.tsx
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { routeObjects } from "./routes";

const router = createBrowserRouter(routeObjects);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
```

Or use the generated default component (it already wraps a data router):

```tsx
// main.tsx
import { createRoot } from "react-dom/client";
import Router from "./routes";

createRoot(document.getElementById("root")!).render(<Router />);
```

#### Legacy: `<BrowserRouter>` (opt-in)

Prefer the older declarative API (`<BrowserRouter>` + `useRoutes`)? Set
`legacyBrowserRouter: true` in config. The generated default component then
renders via `useRoutes` and must be placed inside a `<BrowserRouter>`:

```tsx
// main.tsx
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import Router from "./routes";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Router />
  </BrowserRouter>,
);
```

> ⚠️ Note: the legacy declarative mode ignores `loader`/`action` data
> functions. Use the default data-router mode when you need loaders.

### ⚡ TanStack Router

TanStack Router is wired up the same easy way. Set
`adapter: "tanstack-router"` in your config. Files are still written with
square brackets; dynamic files map to TanStack Router's `$param` routes and
catch-all files map to TanStack Router's `$` splat routes:

| File | TanStack route |
| --- | --- |
| `pages/index.tsx` | `/` |
| `pages/about.tsx` | `/about` |
| `pages/users/[id].tsx` | `/users/$id` |
| `pages/docs/[...slug].tsx` | `/docs/$` |

Internally the resolved tree keeps the adapter-neutral `*rest` catch-all syntax
(also used by `ROUTES`); `toTanstackRouteTree` rewrites it to TanStack's `$`
splat route for you. 🎩

```ts
// rfr.config.ts
import { defineConfig } from "react-fs-router";

export default defineConfig({
  pages: "src/pages",
  adapter: "tanstack-router",
});
```

The generated module exports `routes`, `routesMeta`, `ROUTES`, `routingMeta`,
`ignoreIdentifier`, and `routeTree` — a ready-made TanStack Router route tree —
plus a default `Router` component that builds a TanStack Router from it and
renders it. First install the router peer package:

```bash
npm install @tanstack/react-router
```

Then render the default component:

```tsx
// main.tsx
import { createRoot } from "react-dom/client";
import Router from "./routes";

createRoot(document.getElementById("root")!).render(<Router />);
```

Want the router instance yourself? Use the exported `routeTree` with TanStack
Router's `createRouter` and `RouterProvider`:

```tsx
// main.tsx
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routes";

const router = createRouter({ routeTree, history: createHashHistory() });

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
```

`toTanstackRouteTree` (exported from `react-fs-router/adapters/tanstack`) is the
conversion behind `routeTree`: it maps resolved routes into TanStack
`createRoute` entries, applies root/layout wrappers, converts dynamic segments
(`[id]` → `$id`) and catch-alls (`*rest` → `$` splat), and renders through a
`RouterProvider`.

> 💡 `loader`/`action` files are not translated to TanStack loaders — those
> belong on your own TanStack route definitions. The tree is built at runtime,
> so `params`/`search` are not statically typed; register file routes with
> TanStack's codegen (`routeTree.gen.ts` + `createFileRoute`) when you want
> full type safety.

### 🎨 Bring your own router (`custom`)

For any other routing solution, use the generated `routes` plus a
`renderRoutes` callback (or `createCustomAdapter` from
`react-fs-router/adapters/custom`):

```tsx
import Router from "./routes";

<Router
  renderRoutes={(resolvedRoutes) => (
    <MyRouter routes={resolvedRoutes} />
  )}
/>;
```

Register your own adapter:

```ts
import { defineAdapter } from "react-fs-router";

defineAdapter("my-router", ({ routes }) => <MyRoutes routes={routes} />);
```

---

## 🛠️ CLI & plugins

### CLI (any toolchain)

```bash
npx rfr --input src/pages --output src --adapter react-router
```

Options:

| Flag | Description |
| --- | --- |
| `-i, --input <dir>` | Pages directory (overrides config) |
| `-c, --config <file>` | Config file path (default `rfr.config.ts`) |
| `-o, --output <dir>` | Output directory (overrides config) |
| `-a, --adapter <name>` | Routing adapter to use |
| `-w, --watch` | Watch and regenerate on changes |
| `-b, --build` | Generate once and exit (default) |

### ⚡ Vite plugin

```ts
// vite.config.ts
import { reactFsRouter } from "react-fs-router/vite";

export default {
  plugins: [reactFsRouter({ userConfig: { pages: "src/pages" } })],
};
```

### 📦 Webpack plugin

```js
// webpack.config.js
const { ReactFsRouterWebpackPlugin } = require("react-fs-router/webpack");

module.exports = {
  plugins: [new ReactFsRouterWebpackPlugin({ userConfig: { pages: "src/pages" } })],
};
```

---

## 📜 License

[MIT](https://choosealicense.com/licenses/mit/) — go build something awesome! 🚀
