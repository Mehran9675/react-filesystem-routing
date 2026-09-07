// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { build } from "vite";
import webpack from "webpack";
import { resolveConfig } from "./config.js";
import { writeRoutes } from "./generator.js";
import { reactFsRouter } from "./vite.js";
import { ReactFsRouterWebpackPlugin } from "./webpack.js";

// Real projects must resolve this package's subpath exports, so each temp
// project gets a symlinked `node_modules/react-fs-router` -> repo root. This
// exercises the published `exports` map and the built `dist/` output.
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const projects: string[] = [];

function createProject(): string {
  const project = mkdtempSync(join(repoRoot, ".e2e-"));
  const nodeModules = join(project, "node_modules");
  mkdirSync(nodeModules, { recursive: true });
  const kind = process.platform === "win32" ? "junction" : "dir";
  symlinkSync(repoRoot, join(nodeModules, "react-fs-router"), kind);
  projects.push(project);
  return project;
}

function writePages(project: string): string {
  const pages = join(project, "src", "pages");
  mkdirSync(pages, { recursive: true });
  writeFileSync(join(pages, "index.tsx"), "export default function Home() { return <div>Home</div>; }");
  writeFileSync(join(pages, "about.tsx"), "export default function About() { return <div>About</div>; }");
  return pages;
}

afterAll(() => {
  for (const project of projects) rmSync(project, { recursive: true, force: true });
});

describe("CLI", () => {
  it("generates a routes module for a real project", () => {
    const project = createProject();
    const pages = writePages(project);

    execFileSync(process.execPath, [join(repoRoot, "dist", "cli.js"), "-i", pages, "-o", pages], {
      encoding: "utf8",
    });

    const generated = join(pages, "routes.tsx");
    expect(existsSync(generated)).toBe(true);
    const source = readFileSync(generated, "utf8");
    expect(source).toContain('path: "/about"');
    expect(source).toContain('from "react-fs-router/adapters/react-router"');
    expect(source).toContain("export const routeObjects");
    // The default target is React Router's data-router route objects.
    expect(source).toContain("reactRouterDataAdapter");
    expect(source).toContain("toDataRouterObjects");
  });

  it("generates a tanstack-router routes module via the adapter flag", () => {
    const project = createProject();
    const pages = writePages(project);

    execFileSync(process.execPath, [join(repoRoot, "dist", "cli.js"), "-i", pages, "-o", pages, "-a", "tanstack-router"], {
      encoding: "utf8",
    });

    const generated = join(pages, "routes.tsx");
    const source = readFileSync(generated, "utf8");
    expect(source).toContain('from "react-fs-router/adapters/tanstack"');
    expect(source).toContain("tanstackRouterAdapter");
    expect(source).toContain("export const routeTree");
    expect(source).not.toContain("react-fs-router/adapters/react-router");
  });
});

describe("Vite", () => {
  it("builds a project using the Vite plugin", async () => {
    const project = createProject();
    const pages = writePages(project);
    const src = join(project, "src");
    writeFileSync(
      join(src, "main.tsx"),
      [
        'import { createRoot } from "react-dom/client";',
        'import Router from "./pages/routes";',
        'createRoot(document.getElementById("root")!).render(<Router />);',
      ].join("\n"),
    );
    writeFileSync(
      join(project, "index.html"),
      '<div id="root"></div>\n<script type="module" src="/src/main.tsx"></script>',
    );

    await build({
      root: project,
      logLevel: "error",
      plugins: [reactFsRouter({ userConfig: { pages, outDir: pages } })],
      esbuild: { jsx: "automatic" },
      build: { outDir: "dist", emptyOutDir: true },
    });

    expect(existsSync(join(pages, "routes.tsx"))).toBe(true);
    expect(existsSync(join(project, "dist", "index.html"))).toBe(true);
  }, 120000);

  it("builds a project using the tanstack-router adapter", async () => {
    const project = createProject();
    const pages = writePages(project);
    const src = join(project, "src");
    writeFileSync(
      join(src, "main.tsx"),
      [
        'import { createRoot } from "react-dom/client";',
        'import Router from "./pages/routes";',
        'createRoot(document.getElementById("root")!).render(<Router />);',
      ].join("\n"),
    );
    writeFileSync(
      join(project, "index.html"),
      '<div id="root"></div>\n<script type="module" src="/src/main.tsx"></script>',
    );

    await build({
      root: project,
      logLevel: "error",
      plugins: [reactFsRouter({ userConfig: { pages, outDir: pages, adapter: "tanstack-router" } })],
      esbuild: { jsx: "automatic" },
      build: { outDir: "dist", emptyOutDir: true },
    });

    const generated = join(pages, "routes.tsx");
    expect(existsSync(generated)).toBe(true);
    expect(readFileSync(generated, "utf8")).toContain("export const routeTree");
    expect(existsSync(join(project, "dist", "index.html"))).toBe(true);
  }, 120000);
});

describe("Webpack", () => {
  it("builds a project using the webpack plugin", async () => {
    const project = createProject();
    const pages = writePages(project);
    const src = join(project, "src");
    writeFileSync(
      join(src, "main.tsx"),
      [
        'import { createRoot } from "react-dom/client";',
        'import Router from "./pages/routes";',
        'createRoot(document.getElementById("root")!).render(<Router />);',
      ].join("\n"),
    );

    const stats = await new Promise<webpack.Stats>((res, rej) => {
      webpack(
        {
          mode: "production",
          context: project,
          entry: join(src, "main.tsx"),
          output: { path: join(project, "dist"), filename: "bundle.js" },
          resolve: { extensions: [".tsx", ".ts", ".jsx", ".js", ".json"] },
          resolveLoader: { modules: [join(repoRoot, "node_modules"), "node_modules"] },
          module: {
            rules: [
              {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: { loader: "esbuild-loader", options: { loader: "tsx", target: "es2017", jsx: "automatic" } },
              },
            ],
          },
          plugins: [new ReactFsRouterWebpackPlugin({ userConfig: { pages, outDir: pages } })],
        },
        (err, result) => {
          if (err) rej(err);
          else res(result!);
        },
      );
    });

    expect(stats.hasErrors()).toBe(false);
    expect(existsSync(join(pages, "routes.tsx"))).toBe(true);
    expect(existsSync(join(project, "dist", "bundle.js"))).toBe(true);
  }, 120000);
});

describe("Webpack plugin hooks", () => {
  it("generates the routes module when the compiler runs", () => {
    const project = createProject();
    const pages = writePages(project);

    const taps: Record<string, Array<() => void>> = { beforeRun: [], watchRun: [], watchClose: [] };
    const compiler = {
      hooks: {
        beforeRun: { tap: (_name: string, fn: () => void) => taps.beforeRun.push(fn) },
        watchRun: { tap: (_name: string, fn: () => void) => taps.watchRun.push(fn) },
        watchClose: { tap: (_name: string, fn: () => void) => taps.watchClose.push(fn) },
      },
    };

    const plugin = new ReactFsRouterWebpackPlugin({ userConfig: { pages, outDir: pages } });
    plugin.apply(compiler as never);

    expect(taps.beforeRun).toHaveLength(1);
    expect(taps.watchRun).toHaveLength(1);
    expect(taps.watchClose).toHaveLength(1);

    taps.beforeRun[0]();
    expect(existsSync(join(pages, "routes.tsx"))).toBe(true);

    taps.watchRun[0]();
    taps.watchClose[0]();
  });
});

describe("Custom adapter", () => {
  it("generates and renders a custom-adapter routes module", async () => {
    const project = createProject();
    const pages = writePages(project);
    const config = resolveConfig({ pages, outDir: pages, adapter: "custom" }, project);
    const generated = writeRoutes(config);

    const source = readFileSync(generated, "utf8");
    expect(source).toContain("renderRoutes");
    expect(source).not.toContain("react-fs-router/adapters/react-router");

    const mod = (await import(`${pathToFileURL(generated).href}?t=${Date.now()}`)) as {
      default: (props: { renderRoutes: (routes: unknown[]) => unknown }) => unknown;
    };
    const html = await import("react-dom/server");
    const React = await import("react");
    const output = html.renderToStaticMarkup(
      React.createElement(mod.default, {
        renderRoutes: (routes: unknown[]) =>
          React.createElement("div", {
            "data-count": routes.length,
            "data-path": (routes as { path: string }[])[0].path,
          }),
      }),
    );
    expect(output).toContain('data-count="1"');
    expect(output).toContain('data-path="/"');
  }, 60000);
});
