const fs = require("fs");
const prettier = require("prettier");
const chokidar = require("chokidar");

let isNotThefirstTimeRunning = true;

module.exports = (page_directory) => {
  const pathMaker = () => {
    const readDirectory = (directory: string, includeDirectory?: boolean) => {
      const pages: Record<string, any> = {};
      const read = fs.readdirSync(directory);
      read.forEach((page) => {
        const name = page.split(".")[0];
        if (page.includes(".")) {
          pages[page.replace(".", "_")] = `${
            includeDirectory ? directory : ""
          }/${name === "index" ? "" : name}`;
        } else {
          pages[name] = readDirectory(`${directory}/${page}`, true);
        }
      });
      return pages;
    };
    const pages = readDirectory(page_directory);

    const readFileProperties = (filepath: string) => {
      const file = String(fs.readFileSync(page_directory + filepath)); // todo: put in try catch
      const component = file.match(/(export default .*)\w/g); //todo: export default function *
      const props = file.match(
        /((name|icon|index):( |).*[^{}\[\]-_=\/\\\(\)\*&^%$#@!~`|?><,;:"'])/g
      );
      const result = {
        component: null,
        name: null,
        icon: null,
        index: null,
      };
      if (!file) return result;
      if (component?.length) {
        result.component = component[0].split("default")[1].trim();
      }
      if (props?.length) {
        const name = props.filter((match) => match.includes("name"));
        const icon = props.filter((match) => match.includes("icon"));
        const index = props.filter((match) => match.includes("index"));
        if (name.length) result.name = name[0].split(":")[1].trim();
        if (icon.length) result.icon = icon[0].split(":")[1].trim();
        if (index.length)
          result.index = Number(index[0].split(":")[1].trim()) || 0;
      }
      return result;
    };

    const makeRouteObject = (filepath: string, filename: string) => {
      const route: {
        component?: string;
        name?: string;
        icon?: string;
        index?: number;
        path?: string;
        file?: string;
      } = {
        component: null,
        name: null,
        icon: null,
        index: 0,
        path: filepath,
      };
      const { component, name, icon, index } = readFileProperties(
        `${filepath.match(/(\/)/g).length ? filepath : ""}${
          filename.includes("index")
            ? "/" + filename.replace("_", ".")
            : "." + filename.split("_")[1]
        }`
      );
      if (component) route.component = component;
      if (name) route.name = name;
      if (icon) route.icon = icon;
      if (index) route.index = index;
      if (filepath) route.path = filepath;
      if (filename) route.file = filename;
      return route;
    };

    const makePathsArray = (
      paths: Record<string, any>,
      prevPath?: boolean
    ): Record<string, string>[] => {
      const result = [];
      for (const [file, path] of Object.entries(paths)) {
        if (typeof path === "string") {
          const oj: Record<string, string> = { file };
          if (prevPath) oj.path = path.replace(page_directory, "");
          else oj.path = path;
          result.push(oj);
        } else result.push(...makePathsArray(path, true));
      }
      return result;
    };

    const routes = makePathsArray(pages).map((page) =>
      makeRouteObject(page.path, page.file)
    );

    const _config = `export const routes = ${JSON.stringify(routes)}`;

    const _routes = `${routes
      .map((node) =>
        node?.component
          ? `import ${node.component} from "${
              process.env.PWD + page_directory.replace(".", "")
            }${node.path === "/" ? "" : node.path}";`
          : ""
      )
      .join("")} \n \n export{${routes
      .map((node) => (node?.component ? `${node.component},` : ""))
      .join("")}};`;

    fs.writeFileSync(
      "./node_modules/react-fs-router/dist/src/generated/routeConfigs.js",
      prettier.format(_config, { semi: false, parser: "babel" }),
      (err) => {
        if (err) return console.error(err);
      }
    );

    fs.writeFileSync(
      "./node_modules/react-fs-router/dist/src/generated/route.js",
      prettier.format(_routes, { semi: false, parser: "babel" }),
      (err) => {
        if (err) return console.error(err);
      }
    );
  };

  if (isNotThefirstTimeRunning) {
    pathMaker();
    isNotThefirstTimeRunning = false;
  }
  const watcher = chokidar.watch(page_directory, {
    ignored: /^\./,
    persistent: true,
  });

  watcher
    .on("add", function (path) {
      pathMaker();
      console.log("File", path, "has been added");
    })
    .on("change", function (path) {
      pathMaker();
      console.log("File", path, "has been changed");
    })
    .on("unlink", function (path) {
      pathMaker();
      console.log("File", path, "has been removed");
    })
    .on("error", function (error) {
      console.error("Error happened", error);
    });
};
