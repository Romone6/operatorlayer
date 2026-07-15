import Link from "next/link";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { ProductDataTable, ProductStatus } from "@/components/marketing/product-demo-primitives";
import { Button } from "@/components/ui/button";

const gates = [
  ["Legal threat", "Manager approval", <ProductStatus key="legal" label="Blocked" tone="danger" />],
  ["Refund exception", "Policy + order ID", <ProductStatus key="refund" label="Blocked" tone="danger" />],
  ["Discount promise", "Sales Ops review", <ProductStatus key="discount" label="Repair" tone="warning" />],
  ["Missing source", "Evidence required", <ProductStatus key="source" label="Blocked" tone="danger" />],
  ["Auto-send", "MVP disabled", <ProductStatus key="autosend" label="Disabled" tone="danger" />],
];

const events = [
  ["19:04", "source evidence attached"],
  ["19:05", "legal escalation gate applied"],
  ["19:07", "manager queue assigned"],
  ["19:08", "export blocked until approval"],
  ["19:10", "approval logged"],
];

export function GovernanceArchitecture() {
  return (
    <section className="overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-dark)] py-20 text-white">
      <div className="mx-auto grid max-w-[1560px] gap-10 px-5 lg:grid-cols-[0.34fr_0.66fr] lg:items-center lg:px-10 xl:px-12">
        <div>
          <p className="section-label text-[var(--color-primary-soft)]">Governance architecture</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">Agents should not operate without boundaries.</h2>
          <p className="mt-5 text-lg leading-8 text-white/64">Operant keeps source evidence, review gates, approval rules, export decisions, and event logs in the same operating layer. MVP auto-send remains disabled.</p>
          <div className="mt-8 flex flex-wrap gap-3"><CalendlyButton variant="accent" size="lg" /><Button asChild variant="secondary" size="lg" className="border-white/15 bg-white/8 text-white hover:bg-white/12"><Link href="/security">Security overview</Link></Button></div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/6 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.25)] md:p-6">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-white/10 bg-[#292722] p-5">
              <p className="mb-4 text-lg font-semibold text-white">Approval gate matrix</p>
              <ProductDataTable dark columns={["Signal", "Control", "State"]} rows={gates} />
            </div>
            <div className="rounded-lg border border-white/10 bg-[#292722] p-5">
              <p className="mb-4 text-lg font-semibold text-white">Security event log</p>
              <ProductDataTable dark columns={["Time", "Event"]} rows={events} />
            </div>
          </div>
          <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {["Permissioned ingestion", "Source-level controls", "Human review", "Approval gates"].map((control) => (
              <div key={control} className="bg-white/7 p-4 text-sm font-semibold text-white/82">{control}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
