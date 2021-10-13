"use strict";
exports.__esModule = true;
var configs_path = require("../bin/index").configs_path;
var routes = require(configs_path + "/routeConfigs.js").routes;
var Pages = require(configs_path + "/route.js");
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
function Route() {
    var _a = (0, react_1.useState)(), pages = _a[0], setPages = _a[1];
    var randomStr = function () { return (Math.random() + 1).toString(36).substring(7); };
    (0, react_1.useEffect)(function () {
        setPages(renderConponents(Pages));
    }, []);
    function renderComponent(key, module) {
        return module[key] || module["default"] || module;
    }
    function renderConponents(imports) {
        var renders = [];
        var _loop_1 = function (key, Value) {
            var Component = renderComponent(key, Value);
            var route = routes.filter(function (config) { return (config === null || config === void 0 ? void 0 : config.component) === (Component === null || Component === void 0 ? void 0 : Component.name); })[0];
            renders.push(<react_router_dom_1.Route exact={true} key={randomStr()} path={(route === null || route === void 0 ? void 0 : route.path) || ""}>
          <Component />
        </react_router_dom_1.Route>);
        };
        for (var _i = 0, _a = Object.entries(imports); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], Value = _b[1];
            _loop_1(key, Value);
        }
        return renders;
    }
    return <react_router_dom_1.Switch>{pages}</react_router_dom_1.Switch>;
}
exports["default"] = Route;
