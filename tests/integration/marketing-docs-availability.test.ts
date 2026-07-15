import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DocsPage from "@/app/(marketing)/docs/page";

describe("marketing docs availability labeling", () => {
  it("keeps docs copy grounded in current capability and setup states", () => {
    const html = renderToStaticMarkup(React.createElement(DocsPage));

    expect(html).toContain("explicit capability states");
    expect(html).toContain("Create an organisation, upload authorised sources");
    expect(html).toContain("Connector setup");
    expect(html).toContain("Provider OAuth credentials and enterprise readiness checks are required");
    expect(html).not.toContain("Future API");
    expect(html).not.toContain("Future MCP");
  });
});
