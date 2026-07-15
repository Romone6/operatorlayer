import { describe, expect, it } from "vitest";

import { getCalendlyUrl } from "@/components/marketing/calendly-button";
import { integrationLogos, pricingPlans } from "@/components/marketing/operant-data";
import { auditEvents } from "@/data/audit-events";
import { productJourney } from "@/data/product-journey";
import { productFilmSteps } from "@/src/remotion/data/demo-data";

describe("Operant marketing data contracts", () => {
  it("does not label integration ecosystem items as customers or partners", () => {
    expect(integrationLogos.length).toBeGreaterThan(0);
    expect(integrationLogos.every((item) => item.relationship === "integration")).toBe(true);
  });

  it("keeps demo CTAs backed by the Calendly URL contract", () => {
    const original = process.env.NEXT_PUBLIC_CALENDLY_URL;
    delete process.env.NEXT_PUBLIC_CALENDLY_URL;
    expect(getCalendlyUrl()).toBe("https://calendly.com/operant/demo");

    process.env.NEXT_PUBLIC_CALENDLY_URL = "https://calendly.com/acme/operant";
    expect(getCalendlyUrl()).toBe("https://calendly.com/acme/operant");

    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_CALENDLY_URL;
    } else {
      process.env.NEXT_PUBLIC_CALENDLY_URL = original;
    }
  });

  it("keeps pricing plans demo-led instead of claiming self-serve fake activation", () => {
    expect(pricingPlans.map((plan) => plan.name)).toEqual(["Starter", "Team", "Enterprise"]);
    expect(pricingPlans.every((plan) => plan.cta.includes("demo") || plan.cta.includes("sales"))).toBe(true);
  });

  it("keeps the homepage product story ordered around real governance events", () => {
    expect(productJourney).toEqual(["Ingest", "Structure", "Govern", "Review", "Improve"]);
    expect(auditEvents).toContain("Policy match written");
    expect(auditEvents).toContain("Approved export logged");
    expect(productFilmSteps.map((step) => step.id)).toEqual(["queue", "policy", "score", "review", "repair", "audit"]);
    expect(productFilmSteps.every((step) => step.primary.length > 0 && step.secondary.length > 0)).toBe(true);
  });
});
