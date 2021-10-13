var fs = require("fs");
var prettier = require("prettier");
var chokidar = require("chokidar");
var isNotThefirstTimeRunning = true;
var genPath = function (page_directory) {
    var pathMaker = function () {
        var readDirectory = function (directory, includeDirectory) {
            var pages = {};
            var read = fs.readdirSync(directory);
            read.forEach(function (page) {
                var name = page.split(".")[0];
                if (page.includes(".")) {
                    pages[page.replace(".", "_")] = (includeDirectory ? directory : "") + "/" + (name === "index" ? "" : name);
                }
                else {
                    pages[name] = readDirectory(directory + "/" + page, true);
                }
            });
            return pages;
        };
        var pages = readDirectory(page_directory);
        var readFileProperties = function (filepath) {
            var file = String(fs.readFileSync(page_directory + filepath)); // todo: put in try catch
            var component = file.match(/(export default .*)\w/g); //todo: export default function *
            var props = file.match(/((name|icon|index):( |).*[^{}\[\]-_=\/\\\(\)\*&^%$#@!~`|?><,;:"'])/g);
            var result = {
                component: null,
                name: null,
                icon: null,
                index: null
            };
            if (!file)
                return result;
            if (component === null || component === void 0 ? void 0 : component.length) {
                result.component = component[0].split("default")[1].trim();
            }
            if (props === null || props === void 0 ? void 0 : props.length) {
                var name_1 = props.filter(function (match) { return match.includes("name"); });
                var icon = props.filter(function (match) { return match.includes("icon"); });
                var index = props.filter(function (match) { return match.includes("index"); });
                if (name_1.length)
                    result.name = name_1[0].split(":")[1].trim();
                if (icon.length)
                    result.icon = icon[0].split(":")[1].trim();
                if (index.length)
                    result.index = Number(index[0].split(":")[1].trim()) || 0;
            }
            return result;
        };
        var makeRouteObject = function (filepath, filename) {
            var route = {
                component: null,
                name: null,
                icon: null,
                index: 0,
                path: filepath
            };
            var _a = readFileProperties("" + (filepath.match(/(\/)/g).length ? filepath : "") + (filename.includes("index")
                ? "/" + filename.replace("_", ".")
                : "." + filename.split("_")[1])), component = _a.component, name = _a.name, icon = _a.icon, index = _a.index;
            if (component)
                route.component = component;
            if (name)
                route.name = name;
            if (icon)
                route.icon = icon;
            if (index)
                route.index = index;
            if (filepath)
                route.path = filepath;
            if (filename)
                route.file = filename;
            return route;
        };
        var makePathsArray = function (paths, prevPath) {
            var result = [];
            for (var _i = 0, _a = Object.entries(paths); _i < _a.length; _i++) {
                var _b = _a[_i], file = _b[0], path = _b[1];
                if (typeof path === "string") {
                    var oj = { file: file };
                    if (prevPath)
                        oj.path = path.replace(page_directory, "");
                    else
                        oj.path = path;
                    result.push(oj);
                }
                else
                    result.push.apply(result, makePathsArray(path, true));
            }
            return result;
        };
        var routes = makePathsArray(pages).map(function (page) {
            return makeRouteObject(page.path, page.file);
        });
        var _config = "export const routes = " + JSON.stringify(routes);
        var _routes = routes
            .map(function (node) {
            return (node === null || node === void 0 ? void 0 : node.component)
                ? "import " + node.component + " from \"" + (process.env.PWD + page_directory.replace(".", "")) + (node.path === "/" ? "" : node.path) + "\";"
                : "";
        })
            .join("") + " \n \n export{" + routes
            .map(function (node) { return ((node === null || node === void 0 ? void 0 : node.component) ? node.component + "," : ""); })
            .join("") + "};";
        fs.writeFileSync("./src/config/_config.ts", prettier.format(_config, { semi: false, parser: "babel" }), function (err) {
            if (err)
                return console.error(err);
        });
        fs.writeFileSync("./src/config/_routes.ts", prettier.format(_routes, { semi: false, parser: "babel" }), function (err) {
            if (err)
                return console.error(err);
        });
    };
    if (isNotThefirstTimeRunning) {
        pathMaker();
        isNotThefirstTimeRunning = false;
    }
    // let fsWait: boolean | any = false;
    // fs.watch(page_, (event, filename) => {
    //   if (filename) {
    //     if (fsWait) return;
    //     fsWait = setTimeout(() => {
    //       fsWait = false;
    //     }, 100);
    //     console.log(`${filename} file Changed`);
    //     pathMaker();
    //   }
    // });
    var watcher = chokidar.watch(page_directory, {
        ignored: /^\./,
        persistent: true
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
module.exports = genPath;
