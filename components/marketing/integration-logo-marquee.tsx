"use client";

import type React from "react";
import { siAirtable, siGithub, siGoogle, siHubspot, siIntercom, siJira, siLinear, siNotion, siStripe, siVercel, siZendesk } from "simple-icons";

import { Marquee } from "@/components/marketing/marquee";

type LogoItem = {
  name: string;
  relationship: "integration" | "customer" | "partner";
  icon?: { path: string; title: string };
  custom?: "microsoft" | "slack" | "salesforce";
};

const logos: LogoItem[] = [
  { name: "Microsoft", custom: "microsoft", relationship: "integration" },
  { name: "Google", icon: siGoogle, relationship: "integration" },
  { name: "Slack", custom: "slack", relationship: "integration" },
  { name: "Notion", icon: siNotion, relationship: "integration" },
  { name: "Salesforce", custom: "salesforce", relationship: "integration" },
  { name: "HubSpot", icon: siHubspot, relationship: "integration" },
  { name: "Intercom", icon: siIntercom, relationship: "integration" },
  { name: "Zendesk", icon: siZendesk, relationship: "integration" },
  { name: "GitHub", icon: siGithub, relationship: "integration" },
  { name: "Linear", icon: siLinear, relationship: "integration" },
  { name: "Jira", icon: siJira, relationship: "integration" },
  { name: "Stripe", icon: siStripe, relationship: "integration" },
  { name: "Airtable", icon: siAirtable, relationship: "integration" },
  { name: "Vercel", icon: siVercel, relationship: "integration" },
];

function CustomLogo({ kind }: { kind: NonNullable<LogoItem["custom"]> }) {
  if (kind === "microsoft") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <rect x="2" y="2" width="9" height="9" rx="0.7" />
        <rect x="13" y="2" width="9" height="9" rx="0.7" />
        <rect x="2" y="13" width="9" height="9" rx="0.7" />
        <rect x="13" y="13" width="9" height="9" rx="0.7" />
      </svg>
    );
  }
  if (kind === "slack") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M8 3.4a2 2 0 0 1 4 0v4.2H8V3.4Zm1.9 6.2H5.7a2 2 0 1 1 0-4h4.2v4Zm4.2-6.2a2 2 0 0 1 4 0v4.2h-4V3.4Zm-6.1 10.6v4.2a2 2 0 0 1-4 0V14h4Zm1.9 0a2 2 0 1 1 0 4H5.7v-4h4.2Zm4.2 0h4.2a2 2 0 1 1 0 4h-4.2v-4Zm1.9-4.4h4.2a2 2 0 1 1 0 4H16V9.6Zm-1.9 0v4.2h-4V9.6h4Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 24" className="h-7 w-9 fill-current" aria-hidden="true">
      <path d="M13.6 18.8c-3.7 0-6.8-2.5-6.8-5.7 0-.5.1-1 .2-1.5C4.5 11.1 2.7 9.3 2.7 7.1c0-2.6 2.6-4.8 5.8-4.8 1.3 0 2.5.4 3.5 1 1.4-1.2 3.5-2 5.8-2 3.9 0 7.1 2.2 7.7 5.1 3.4.3 6.1 2.6 6.1 5.4 0 3-3.1 5.4-7 5.4H13.6Z" />
    </svg>
  );
}

function LogoMark({ item }: { item: LogoItem }) {
  if (item.icon) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d={item.icon.path} />
      </svg>
    );
  }
  return <CustomLogo kind={item.custom ?? "microsoft"} />;
}

function LogoWordmark({ item }: { item: LogoItem }) {
  return (
    <div className="flex items-center gap-3 text-[#7d796f] opacity-65 transition duration-200 hover:opacity-100 hover:text-[var(--color-text-main)]" aria-label={item.name}>
      <LogoMark item={item} />
      <span className="text-xl font-semibold tracking-[-0.035em]">{item.name}</span>
    </div>
  );
}

export function IntegrationLogoMarquee() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background-panel)] py-12">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <h2 className="text-center text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-muted)]">Works with the tools modern teams already use</h2>
        <div className="logo-marquee-mask mt-9">
          <Marquee pauseOnHover repeat={4} className="[--duration:38s] [--gap:5.5rem]">
            {logos.map((item) => <LogoWordmark key={item.name} item={item} />)}
          </Marquee>
        </div>
      </div>
    </section>
  );
}

