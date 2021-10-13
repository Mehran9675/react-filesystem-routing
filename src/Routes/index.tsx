//@ts-ignore
import { routes } from "dist/generated/routeConfigs";
//@ts-ignore
import * as Pages from "dist/generated/routes";
import React, { ReactElement, ReactNode, useState, useEffect } from "react";
import { Route, Switch } from "react-router-dom";

export default function Route(): ReactElement {
  const [pages, setPages] = useState<React.ReactNode[]>();
  const randomStr = () => (Math.random() + 1).toString(36).substring(7);

  useEffect(() => {
    setPages(renderConponents(Pages));
  }, []);

  function renderComponent(key, module) {
    return module[key] || module["default"] || module;
  }

  function renderConponents(imports: Record<string, ReactNode>) {
    let renders: React.ReactNode[] = [];
    for (const [key, Value] of Object.entries(imports)) {
      const Component = renderComponent(key, Value);
      const route = routes.filter(
        (config) => config?.component === Component?.name
      )[0];

      //@ts-ignore
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
