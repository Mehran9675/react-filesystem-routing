import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createCustomAdapter } from "./custom.js";
import type { ResolvedRoute } from "../render.js";

describe("createCustomAdapter", () => {
  it("renders via the provided render function", () => {
    const routes: ResolvedRoute[] = [];
    const Adapter = createCustomAdapter((r) => <div data-testid="custom">{r.length}</div>);

    render(<Adapter routes={routes} />);
    expect(screen.getByTestId("custom").textContent).toBe("0");
  });
});
