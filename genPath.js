const fs = require("fs");
const prettier = require("prettier");
const chokidar = require("chokidar");

let isNotThefirstTimeRunning = true;

const genPath = (page_directory, configs_directory, runOnce) => {
  //main function
  const pathMaker = () => {
    //parse parameters in path
    const parsePageName = (fileName) => {
      const isParam = fileName.includes("[") && fileName.includes("]");

      const splitFileName = fileName.split("/");
      if (splitFileName.length && isParam) {
        const paramName = splitFileName[splitFileName.length - 1];
        const paramNameWithoutExtention = paramName.split(".")[0];
        const paramNameWithoutBraces = paramNameWithoutExtention
          .replace("[", "")
          .replace("]", "");
        splitFileName[splitFileName.length - 1] = `:${paramNameWithoutBraces}`;
        return splitFileName.join("/");
      } else if (fileName === "index" && !isParam) return "";
      else return fileName;
    };

    const parseFilePath = (filePath) => {
      if (filePath.includes(":")) {
        const splitPath = filePath.split("/");
        const lastItemInPath = splitPath[splitPath.length - 1].replace(":", "");
        splitPath[splitPath.length - 1] = `[${lastItemInPath}]`;
        return splitPath.join("/");
      } else return filePath;
    };

    //read page directory
    const readDirectory = (directory, includeDirectory) => {
      const pages = {};
      const read = fs.readdirSync(directory);
      const readFiltered = read.filter((file) => !file.startsWith("_"));
      readFiltered.forEach((page) => {
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

    const readFileProperties = (filepath) => {
      const file = String(fs.readFileSync(page_directory + filepath));
      const not = ["default", "function", "export"];
      const component = file.match(
        /((export default .*)|(default function .*))\w/g
      );

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
        result.component = component[0]
          .split(" ")
          .filter((match) => !not.includes(match))[0];
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

    const makeRouteObject = (filepath, filename) => {
      const route = {
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
      if (filepath) route.path = parsePageName(filepath);
      if (filename) route.file = filename.replace("_", ".");

      return route;
    };

    const makePathsArray = (paths, prevPath) => {
      const result = [];
      for (const [file, path] of Object.entries(paths)) {
        if (typeof path === "string") {
          const oj = { file };
          if (prevPath) oj.path = path.replace(page_directory, "");
          else oj.path = path;
          result.push(oj);
        } else result.push(...makePathsArray(path, true));
      }
      return result;
    };

    const routes = makePathsArray(pages)
      .map((page) => makeRouteObject(page.path, page.file))
      .sort((a, b) => b.index - a.index);

    const _config = `export const routes = ${JSON.stringify(routes)}`;

    const _routes = `${routes
      .map((node) =>
        node?.component
          ? `import ${node.component} from "${
              process.env.PWD + page_directory.replace(".", "")
            }${node.path === "/" ? "" : parseFilePath(node.path)}";`
          : ""
      )
      .join("")} \n \n export{${routes
      .map((node) => (node?.component ? `${node.component},` : ""))
      .join("")}};`;

    const parseFileExtention = (ext) => {
      if (ext) {
        if (ext.includes(".")) return ext;
        else return "." + ext;
      } else return ".js";
    };
    fs.writeFileSync(
      (configs_directory || page_directory) +
        `/_page-properties${parseFileExtention(".js")}`,
      prettier.format(_config, { semi: false, parser: "babel" }),
      (err) => {
        if (err) return console.error(err);
      }
    );

    fs.writeFileSync(
      (configs_directory || page_directory) +
        `/_routes${parseFileExtention(".js")}`,
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
    ignored: /^\.|\_/,
    persistent: !runOnce,
  });

  watcher
    .on("add", function (path) {
      try {
        pathMaker();
      } catch (e) {
        console.log(e);
      }
      console.log("File", path, "has been added");
    })
    .on("change", function (path) {
      try {
        pathMaker();
      } catch (e) {
        console.log(e);
      }
      console.log("File", path, "has been changed");
    })
    .on("unlink", function (path) {
      try {
        pathMaker();
      } catch (e) {
        console.log(e);
      }
      console.log("File", path, "has been removed");
    })
    .on("error", function (error) {
      console.error("Error happened", error);
    });
};

module.exports = { genPath };
