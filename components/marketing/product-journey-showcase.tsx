"use client";

import type React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Archive, ClipboardCheck, Layers3, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductBrowserFrame, ProductDataTable, ProductStatus } from "@/components/marketing/product-demo-primitives";
import { cn } from "@/lib/utils";

type StepKey = "ingest" | "structure" | "govern" | "review" | "improve";

type JourneyStep = {
  key: StepKey;
  title: string;
  headline: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

const steps: JourneyStep[] = [
  { key: "ingest", title: "Ingest", headline: "Approved sources enter a controlled registry.", body: "Docs, tickets, CRM notes, owners, PII filters, deletion controls, and ingestion audit events are visible before any rule is generated.", icon: Archive },
  { key: "structure", title: "Structure", headline: "Source material becomes agent-usable operating files.", body: "Operant creates policies, scenario playbooks, phrase libraries, evidence maps, and evaluation rubrics with source ownership intact.", icon: Layers3 },
  { key: "govern", title: "Govern", headline: "Approval gates decide what can leave the agent.", body: "Legal threats, discount promises, missing sources, and auto-send conditions are checked before export.", icon: ShieldCheck },
  { key: "review", title: "Review", headline: "Humans repair, approve, or reject with evidence in view.", body: "Reviewers see the draft, matched evidence, scoring, missing context, suggested repair, and final export state.", icon: ClipboardCheck },
  { key: "improve", title: "Improve", headline: "Audit evidence turns into better operating rules.", body: "Repeated policy gaps, repair success, missing context trends, and reviewer comments become recommended updates.", icon: RefreshCcw },
];

function IngestPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <ProductDataTable
        columns={["Source", "Owner", "Access", "Control", "Audit"]}
        rows={[
          ["Support handbook", "Legal", "Scoped", "Deletion controls", "Indexed 19:04"],
          ["Refund tickets", "Support Ops", "PII filtered", "Read only", "Ingesting"],
          ["CRM renewal notes", "CS Ops", "Read only", "Account scoped", "Indexed 19:06"],
          ["Pricing rules", "Sales Ops", "Approved", "Owner review", "Indexed 19:07"],
          ["Brand language", "Marketing", "Approved", "Terminology lock", "Indexed 19:09"],
        ]}
      />
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <p className="font-semibold">Source governance</p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3"><span>PII filter</span><ProductStatus label="Enabled" tone="success" /></div>
          <div className="flex items-center justify-between gap-3"><span>Deletion controls</span><ProductStatus label="Available" tone="accent" /></div>
          <div className="flex items-center justify-between gap-3"><span>Ingestion audit</span><ProductStatus label="On" tone="success" /></div>
        </div>
      </div>
    </div>
  );
}

function StructurePanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-lg border border-white/10 bg-[var(--color-dark)] p-4 text-white">
        <p className="font-semibold text-[var(--color-primary-soft)]">Generated operating files</p>
        <div className="mt-4 font-mono text-sm">
          <ProductDataTable
            dark
            columns={["File", "Records", "Owner"]}
            rows={[
              ["communication_policy.json", "42 rules", "Legal"],
              ["scenario_playbooks.json", "18 flows", "Ops"],
              ["phrase_library.json", "126 phrases", "Marketing"],
              ["forbidden_phrases.json", "31 phrases", "Legal"],
              ["evaluation_rubric.json", "14 checks", "AI Ops"],
            ]}
          />
        </div>
      </div>
      <ProductDataTable
        columns={["Rule", "Evidence", "Confidence", "Review state"]}
        rows={[
          ["Legal threat escalation", "Legal playbook line 42", "91%", "Human reviewed"],
          ["Refund order-ID requirement", "Support handbook line 18", "96%", "Active"],
          ["Discount promise guardrail", "Revenue enablement line 9", "89%", "Owner review"],
          ["Approved escalation phrase", "Brand guide line 27", "84%", "Active"],
        ]}
      />
    </div>
  );
}

function GovernPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <ProductDataTable
        columns={["Signal", "Rule", "Required action", "Export state"]}
        rows={[
          ["Legal threat", "Refund + legal escalation", "Manager approval", <ProductStatus key="blocked" label="Blocked" tone="danger" />],
          ["Discount promise", "Pricing objection rules", "Sales Ops repair", <ProductStatus key="repair" label="Repair" tone="warning" />],
          ["Missing source", "Evidence required", "Attach source", <ProductStatus key="source" label="Blocked" tone="danger" />],
          ["Auto-send", "MVP disabled", "No silent send", <ProductStatus key="disabled" label="Disabled" tone="danger" />],
        ]}
      />
      <div className="rounded-lg border border-[var(--color-border)] bg-white/78 p-4">
        <p className="font-semibold">Governance decision</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--color-danger)]">Export blocked</p>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">The draft cannot leave the agent workspace until evidence is attached and the manager approves the repair.</p>
      </div>
    </div>
  );
}

function ReviewPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="grid gap-4">
        <section className="rounded-lg border border-[color:var(--color-danger)]/30 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-danger)]">Before draft</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.045em]">{"\"We are legally required to refund you.\""}</p>
        </section>
        <section className="rounded-lg border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/8 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">After repair</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.045em]">{"\"I can escalate this for review after we confirm the order ID.\""}</p>
        </section>
      </div>
      <ProductDataTable
        columns={["Review field", "Value", "Required action"]}
        rows={[
          ["Matched policy", "Refund Policy v3", "Keep attached"],
          ["Missing context", "Order ID", "Request before export"],
          ["Reviewer notes", "Avoid legal interpretation", "Repair draft"],
          ["Decision", "Manager queue", "Approve / repair / reject"],
        ]}
      />
    </div>
  );
}

function ImprovePanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <ProductDataTable
        columns={["Trend", "Observed", "Recommended update"]}
        rows={[
          ["Policy gap repeated", "8 times", "Add legal-threat escalation branch"],
          ["Repair success", "91%", "Promote approved phrase"],
          ["Missing context", "Order ID rising", "Add pre-export requirement"],
          ["Review reason", "Legal phrasing", "Expand forbidden phrases"],
        ]}
      />
      <div className="rounded-lg border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/8 p-5">
        <p className="text-sm font-semibold text-[var(--color-primary-hover)]">Recommended policy update</p>
        <h3 className="mt-4 text-4xl font-semibold tracking-[-0.055em]">Add escalation rule for legal threat language.</h3>
        <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">Reviewer feedback suggests requiring the order ID and approved escalation language whenever a customer mentions legal action.</p>
      </div>
    </div>
  );
}

function StepPanel({ step }: { step: JourneyStep }) {
  const panels: Record<StepKey, React.ReactNode> = {
    ingest: <IngestPanel />,
    structure: <StructurePanel />,
    govern: <GovernPanel />,
    review: <ReviewPanel />,
    improve: <ImprovePanel />,
  };
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }} className="min-h-[460px]">
        {panels[step.key]}
      </motion.div>
    </AnimatePresence>
  );
}

export function ProductJourneyShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const step = steps[active];

  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => setActive((value) => (value + 1) % steps.length), 4200);
    return () => window.clearInterval(id);
  }, [paused, reduced]);

  return (
    <section id="product-tour" data-testid="product-tour" className="border-b border-[var(--color-border)] bg-[var(--color-background-panel)] py-20">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:items-end">
          <div>
            <p className="section-label">Guided product walkthrough</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">The operating layer is visible at every step.</h2>
          </div>
          <p className="text-lg leading-8 text-[var(--color-text-muted)]">Click through the product path without scroll tricks: source control, generated rules, review gates, repairs, exports, and audit evidence.</p>
        </div>
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="mt-10">
          <div className="grid gap-2 md:grid-cols-5">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const selected = index === active;
              return (
                <button key={item.key} type="button" onClick={() => { setActive(index); setPaused(true); }} className={cn("flex items-center gap-3 rounded-lg border p-4 text-left transition", selected ? "border-[var(--color-primary)] bg-[color:var(--color-primary)]/10 shadow-[0_16px_48px_rgba(201,111,58,0.14)]" : "border-[var(--color-border)] bg-white/70 hover:bg-white")}>
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-md", selected ? "bg-[var(--color-dark)] text-white" : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]")}><Icon className="h-4 w-4" /></span>
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="hidden text-xs text-[var(--color-text-soft)] xl:block">{index + 1} / 5</span>
                  </span>
                </button>
              );
            })}
          </div>
          <ProductBrowserFrame title="Operant workflow" route={step.title.toLowerCase()} status={paused ? "Manual step" : "Auto play"} className="mt-5">
            <div className="grid gap-5 p-5 lg:grid-cols-[0.28fr_0.72fr]">
              <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-hover)]">{step.title}</p>
                <h3 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{step.headline}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--color-text-muted)]">{step.body}</p>
              </aside>
              <StepPanel step={step} />
            </div>
          </ProductBrowserFrame>
        </div>
      </div>
    </section>
  );
}
