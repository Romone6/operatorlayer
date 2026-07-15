import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import SetupRequiredPage from "@/app/setup-required/page";

const envKeys = [
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPERATORLAYER_OAUTH_STATE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "HUBSPOT_CLIENT_ID",
  "HUBSPOT_CLIENT_SECRET",
  "SALESFORCE_CLIENT_ID",
  "SALESFORCE_CLIENT_SECRET",
  "INTERCOM_CLIENT_ID",
  "INTERCOM_CLIENT_SECRET",
  "ZENDESK_CLIENT_ID",
  "ZENDESK_CLIENT_SECRET",
  "ZENDESK_AUTHORIZE_URL",
  "ZENDESK_TOKEN_URL",
  "ZENDESK_API_BASE_URL",
] as const;

const original = Object.fromEntries(envKeys.map((key) => [key, process.env[key]])) as Record<string, string | undefined>;

function restore() {
  for (const key of envKeys) {
    const value = original[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe.sequential("setup-required onboarding checklist page", () => {
  afterEach(() => {
    restore();
  });

  it("renders blocked readiness with real missing environment counts", () => {
    for (const key of envKeys) delete process.env[key];
    const html = renderToStaticMarkup(React.createElement(SetupRequiredPage));

    expect(html).toContain("Readiness meter");
    expect(html).toContain("blocked");
    expect(html).toContain("0/22 prerequisites configured (0%).");
    expect(html).toContain("Action required (5 missing)");
    expect(html).toContain("Action required (17 missing)");
  });

  it("renders ready status when all required environment variables are present", () => {
    for (const key of envKeys) process.env[key] = "configured";
    const html = renderToStaticMarkup(React.createElement(SetupRequiredPage));

    expect(html).toContain("ready");
    expect(html).toContain("22/22 prerequisites configured (100%).");
    expect(html).toContain("Status: Complete");
  });
});
