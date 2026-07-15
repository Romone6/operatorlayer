"use client";

import type React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ClipboardCheck, FileText, History, Pause, Play, ShieldAlert, Workflow } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { HeroProductFilm } from "@/components/marketing/hero-product-film";
import { MiniBar, ProductBrowserFrame, ProductDataTable, ProductStatus } from "@/components/marketing/product-demo-primitives";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type HeroTab = "queue" | "policies" | "scenarios" | "audit";

const tabs: Array<{ value: HeroTab; label: string; route: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "queue", label: "Queue", route: "review queue / refund escalation", icon: ClipboardCheck },
  { value: "policies", label: "Policies", route: "policy registry / source evidence", icon: FileText },
  { value: "scenarios", label: "Scenarios", route: "scenario playbooks / review gates", icon: Workflow },
  { value: "audit", label: "Audit", route: "audit log / export decisions", icon: History },
];

export function QueuePanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-lg border border-[color:var(--color-danger)]/30 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <ProductStatus label="High risk" tone="danger" />
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Refund response flagged before export</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              Customer threatens legal action. The draft contains legal interpretation and is missing the order ID required by policy.
            </p>
          </div>
          <ProductStatus label="Manager queue" tone="warning" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-danger)]">Incoming draft</p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.04em]">{"\"We are legally required to refund you.\""}</p>
          </div>
          <div className="rounded-lg border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/8 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">Suggested repair</p>
            <p className="mt-3 text-xl font-semibold tracking-[-0.04em]">{"\"I can escalate this for review after we confirm the order ID.\""}</p>
          </div>
        </div>
      </section>
      <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">Reviewer console</p>
          <ShieldAlert className="h-4 w-4 text-[var(--color-danger)]" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm">Approve</Button>
          <Button variant="accent" size="sm">Repair</Button>
          <Button variant="secondary" size="sm">Reject</Button>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-white/80 p-4">
          <MiniBar label="Risk" value={86} tone="danger" />
          <div className="mt-3"><MiniBar label="Tone fit" value={71} tone="warning" /></div>
          <div className="mt-3"><MiniBar label="Policy fit" value={96} tone="success" /></div>
          <div className="mt-3"><MiniBar label="Context completeness" value={62} tone="warning" /></div>
        </div>
        <ProductDataTable
          columns={["Signal", "Result"]}
          rows={[
            ["Matched policy", "Refund Policy v3"],
            ["Missing context", "Order ID"],
            ["Export state", "Blocked until approval"],
          ]}
        />
      </aside>
    </div>
  );
}

export function PoliciesPanel() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <ProductDataTable
        columns={["Policy", "Source", "Owner", "Coverage", "Scenarios"]}
        rows={[
          ["Refund Policy v3", "Support handbook", "Legal", "96%", "12 linked"],
          ["Legal Threat Escalation", "Legal playbook", "Legal", "91%", "6 linked"],
          ["Pricing Objection Rules", "Revenue enablement", "Sales Ops", "89%", "8 linked"],
          ["Approved Terminology", "Brand guide", "Marketing", "84%", "18 linked"],
          ["Renewal Risk Playbook", "CS handbook", "CS Ops", "87%", "9 linked"],
        ]}
      />
      <section className="rounded-lg border border-[var(--color-border)] bg-white/78 p-4">
        <p className="text-sm font-semibold">Evidence attached to draft</p>
        <div className="mt-4 space-y-3 text-sm">
          <div className="border-l-2 border-[var(--color-primary)] pl-3">
            <p className="font-semibold">Refund Policy v3</p>
            <p className="text-[var(--color-text-muted)]">Line 18: Legal-risk refunds require manager review.</p>
          </div>
          <div className="border-l-2 border-[var(--color-danger)] pl-3">
            <p className="font-semibold">Legal Threat Escalation Rule</p>
            <p className="text-[var(--color-text-muted)]">Do not interpret legal obligations. Request context and escalate.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ScenariosPanel() {
  return (
    <ProductDataTable
      columns={["Scenario", "Trigger", "Matched policy", "Review rule", "Export state"]}
      rows={[
        ["Refund escalation", "Legal threat language detected", "Refund Policy v3 + Legal Escalation Rule", "Manager approval required", <ProductStatus key="refund" label="Blocked" tone="danger" />],
        ["Pricing objection", "Unapproved discount promise", "Pricing Objection Rules", "Sales Ops review", <ProductStatus key="pricing" label="Repair ready" tone="warning" />],
        ["Renewal-risk message", "Churn-sensitive wording", "Renewal Risk Playbook", "CSM manager review", <ProductStatus key="renewal" label="Needs QBR note" tone="warning" />],
        ["Cross-team update", "Unsupported completion claim", "Operating Cadence Rules", "Owner required", <ProductStatus key="ops" label="Context required" tone="accent" />],
      ]}
    />
  );
}

export function AuditPanel() {
  const logs = [
    ["19:04", "System", "Policy match written", "refund-policy-v3"],
    ["19:04", "System", "Risk detected", "legal threat"],
    ["19:05", "Operant", "Review route assigned", "manager queue"],
    ["19:07", "Operant", "Repair suggested", "legal language removed"],
    ["19:08", "Operant", "Export blocked", "approval missing"],
    ["19:10", "Manager", "Manager approved", "evidence attached"],
    ["19:10", "Operant", "Approved export logged", "support workspace"],
  ];
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white/78 p-3">
      <div className="grid gap-2">
        {logs.map(([time, actor, event, detail], index) => (
          <motion.div
            key={`${time}-${event}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.045 }}
            className="grid grid-cols-[58px_90px_1fr_1fr] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background-panel)] px-3 py-3 text-sm last:border-b-0 max-md:grid-cols-1"
          >
            <span className="font-mono text-xs text-[var(--color-text-soft)]">{time}</span>
            <span className="text-[var(--color-text-muted)]">{actor}</span>
            <span className="font-semibold">{event}</span>
            <span className="text-[var(--color-text-muted)]">{detail}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Panel({ value }: { value: HeroTab }) {
  const panels = useMemo<Record<HeroTab, React.ReactNode>>(() => ({
    queue: <QueuePanel />,
    policies: <PoliciesPanel />,
    scenarios: <ScenariosPanel />,
    audit: <AuditPanel />,
  }), []);

  return (
    <AnimatePresence mode="wait">
      <motion.div key={value} initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.99 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        {panels[value]}
      </motion.div>
    </AnimatePresence>
  );
}

export function HeroProductTheatre() {
  const [value, setValue] = useState<HeroTab>("queue");
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();
  const activeRoute = tabs.find((tab) => tab.value === value)?.route;

  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = window.setInterval(() => {
      setValue((current) => tabs[(tabs.findIndex((tab) => tab.value === current) + 1) % tabs.length].value);
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion]);

  function pauseTemporarily() {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 9000);
  }

  return (
    <section className="hero-surface overflow-hidden border-b border-[var(--color-border)]">
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1680px] items-center gap-8 px-5 py-10 lg:grid-cols-[0.39fr_0.61fr] lg:px-10 xl:px-12">
        <div className="relative z-10">
          <p className="section-label">The operating layer for AI agents</p>
          <h1 className="editorial-heading mt-5 max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.07em] md:text-7xl xl:text-[6rem] 2xl:text-[6.7rem]">Teach AI agents how your company actually operates.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)] xl:text-xl xl:leading-9">Operant checks agent output against approved policy, source evidence, review rules, and audit requirements before work reaches customers.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CalendlyButton variant="accent" size="lg" showIcon />
            <Button asChild variant="secondary" size="lg"><Link href="#product-tour">See how it works</Link></Button>
          </div>
        </div>

        <div className="relative min-h-[760px] lg:min-h-[810px]">
          <HeroProductFilm className="absolute inset-x-0 top-0 h-[620px] xl:h-[700px]" />
          <ProductBrowserFrame title="Interactive product inspector" route={activeRoute} status={paused ? "Paused" : "Auto loop"} className="absolute inset-x-0 bottom-0 z-10 bg-[color:var(--color-background-panel)]/95 backdrop-blur-xl">
            <div className="p-3 md:p-4">
              <Tabs value={value} onValueChange={(next) => { setValue(next as HeroTab); pauseTemporarily(); }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="p-0">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <TabsList className="grid h-auto flex-1 grid-cols-4 rounded-lg bg-[var(--color-background-soft)] p-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-md py-2.5 text-xs data-[state=active]:bg-[var(--color-dark)] data-[state=active]:text-white sm:text-sm">
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <Button type="button" variant="secondary" size="sm" className="hidden gap-2 lg:inline-flex" onClick={() => setPaused((next) => !next)}>
                    {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {paused ? "Resume" : "Pause"}
                  </Button>
                </div>
                <div className="max-h-[395px] overflow-auto pr-1">
                  {tabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} forceMount className={cn("m-0", value !== tab.value && "hidden")}>
                      {value === tab.value ? <Panel value={tab.value} /> : null}
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </div>
          </ProductBrowserFrame>
        </div>
      </div>
    </section>
  );
}
