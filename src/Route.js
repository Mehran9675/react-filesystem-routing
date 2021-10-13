const { configs_path } = require("../bin/index");
const { routes } = require(configs_path + "/routeConfigs.js");
const Pages = require(configs_path + "/route.js");

import React, { useState, useEffect } from "react";
import { Route, Switch } from "react-router-dom";

export default function Route() {
  const [pages, setPages] = useState();
  const randomStr = () => (Math.random() + 1).toString(36).substring(7);

  useEffect(() => {
    setPages(renderConponents(Pages));
  }, []);

  function renderComponent(key, module) {
    return module[key] || module["default"] || module;
  }

  function renderConponents(imports) {
    let renders = [];
    for (const [key, Value] of Object.entries(imports)) {
      const Component = renderComponent(key, Value);
      const route = routes.filter(
        (config) => config?.component === Component?.name
      )[0];

      renders.push(
        <Route exact={true} key={randomStr()} path={route?.path || ""}>
          <Component />
        </Route>
      );
    }
    return renders;
  }
  return <Switch>{pages}</Switch>;
}
