import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CustomersPage from "@/app/(marketing)/customers/page";
import IntegrationsPage from "@/app/(marketing)/integrations/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import SecurityPage from "@/app/(marketing)/security/page";

function htmlFor(component: React.ReactElement) {
  return renderToStaticMarkup(component);
}

describe("marketing status labels", () => {
  it("uses explicit connector, security, and proof states without fake trust claims", () => {
    const integrationsHtml = htmlFor(React.createElement(IntegrationsPage));
    expect(integrationsHtml).toContain("Enterprise setup required");
    expect(integrationsHtml).toContain("Planned");
    expect(integrationsHtml).toContain("does not pretend live connectors are production-ready");

    const pricingHtml = htmlFor(React.createElement(PricingPage));
    expect(pricingHtml).toContain("Connector onboarding");
    expect(pricingHtml).toContain("No hidden auto-send by default");
    expect(pricingHtml).toContain("Structural differences across review and automation approaches");

    const securityHtml = htmlFor(React.createElement(SecurityPage));
    expect(securityHtml).toContain("clear enterprise readiness states");
    expect(securityHtml).toContain("Compliance discussions are grounded in controls");

    const customersHtml = htmlFor(React.createElement(CustomersPage));
    expect(customersHtml).toContain("future-ready customer stories page");
    expect(customersHtml).toContain("Works with the tools modern teams already use");
    expect(customersHtml).not.toContain("Trusted by");
  });
});

