"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  FileCheck2,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  differentiationItems,
  governanceItems,
  integrationLogos,
  problemItems,
  scenarioItems,
  tourSteps,
} from "@/components/marketing/operant-data";
import { CalendlyButton } from "@/components/marketing/calendly-button";

const stagger = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function ProductWindow({ children, title = "Operant" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] shadow-[0_24px_70px_rgba(36,35,31,0.12)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#c8c0b2]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#d5bc9e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#9ab09a]" />
        <span className="ml-auto text-xs font-medium text-[var(--color-text-soft)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatusLine({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white/45 px-3 py-2 text-xs">
      <span className="text-[var(--color-text-soft)]">{label}</span>
      <Badge variant={tone}>{value}</Badge>
    </div>
  );
}

export function CommandInputDemo() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
        <p className="text-sm text-[var(--color-text-main)]">Draft a refund response for a customer threatening legal action.</p>
      </div>
    </div>
  );
}

export function PolicyMatchCard() {
  return (
    <motion.div variants={stagger} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-[var(--color-success)]" aria-hidden="true" />
          <p className="text-sm font-semibold">Refund policy v3 matched</p>
        </div>
        <Badge variant="success">92% confidence</Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">Policy requires escalation when legal threat language appears with refund demand.</p>
    </motion.div>
  );
}

export function ApprovalPanel() {
  return (
    <motion.div variants={stagger} className="rounded-2xl border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/8 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
          <p className="text-sm font-semibold">Manager approval required</p>
        </div>
        <Badge variant="warning">Risk: legal</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["Approve", "Repair", "Reject"].map((label) => (
          <button key={label} type="button" className="rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-main)] shadow-sm">
            {label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function AuditLogPreview() {
  const rows = [
    ["19:04", "Policy match", "refund-policy-v3"],
    ["19:04", "Risk detected", "legal threat"],
    ["19:05", "Review route", "manager queue"],
    ["19:07", "Decision logged", "repair required"],
  ];
  return (
    <motion.div variants={stagger} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Audit trail</p>
        <Clock3 className="h-4 w-4 text-[var(--color-text-soft)]" aria-hidden="true" />
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(([time, event, detail]) => (
          <div key={`${time}-${event}`} className="grid grid-cols-[42px_1fr] gap-3 rounded-xl bg-white/55 px-3 py-2 text-xs">
            <span className="text-[var(--color-text-soft)]">{time}</span>
            <span><span className="font-semibold">{event}</span><span className="text-[var(--color-text-soft)]"> · {detail}</span></span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function AnimatedHeroDemo() {
  return (
    <ProductWindow title="review queue / refund escalation">
      <div className="grid min-h-[520px] grid-cols-[150px_1fr] bg-[var(--color-background-panel)] max-sm:grid-cols-1">
        <aside className="border-r border-[var(--color-border)] bg-[var(--color-background-soft)] p-4 max-sm:hidden">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Workspace</div>
          {[
            ["Queue", "active"],
            ["Policies", ""],
            ["Scenarios", ""],
            ["Audit", ""],
          ].map(([label, active]) => (
            <div key={label} className={`mb-2 rounded-xl px-3 py-2 text-xs font-medium ${active ? "bg-white text-[var(--color-text-main)] shadow-sm" : "text-[var(--color-text-muted)]"}`}>{label}</div>
          ))}
        </aside>
        <motion.div className="p-5" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} transition={{ staggerChildren: 0.18 }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Support agent draft</p>
              <p className="text-xs text-[var(--color-text-soft)]">Acme Support · ticket #1824</p>
            </div>
            <Badge variant="warning">Approval required</Badge>
          </div>
          <motion.div variants={stagger}>
            <CommandInputDemo />
          </motion.div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_190px]">
            <div className="space-y-4">
              <PolicyMatchCard />
              <ApprovalPanel />
              <motion.div variants={stagger} className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-semibold">Repair suggestion</span>
                  <Badge variant="accent">Tone revised</Badge>
                </div>
                <p className="text-sm leading-6 text-[var(--color-text-muted)]">Acknowledge the issue, avoid legal interpretation, provide the approved escalation path, and confirm a manager will follow up.</p>
              </motion.div>
            </div>
            <div className="space-y-3">
              <StatusLine label="Risk" value="High" tone="danger" />
              <StatusLine label="Missing context" value="Order ID" tone="warning" />
              <StatusLine label="Policy fit" value="92%" tone="success" />
              <StatusLine label="Final state" value="Logged" tone="default" />
            </div>
          </div>
          <div className="mt-4">
            <AuditLogPreview />
          </div>
        </motion.div>
      </div>
    </ProductWindow>
  );
}

export function InfiniteLogoMarquee() {
  const items = useMemo(() => [...integrationLogos, ...integrationLogos], []);
  return (
    <section className="border-y border-[var(--color-border)] bg-[color:var(--color-background-panel)]/70 py-8" aria-labelledby="integration-marquee-heading">
      <div className="mx-auto max-w-7xl px-5">
        <p id="integration-marquee-heading" className="section-label text-center">Works with the tools modern teams already use</p>
      </div>
      <div className="logo-marquee-mask mt-6 overflow-hidden" aria-label="Integration ecosystem logos">
        <div className="logo-marquee-track flex w-max gap-3 pr-3">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={`${item.name}-${index}`} className="flex min-w-max items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-background-soft)] text-[var(--color-primary-hover)]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="text-sm font-semibold text-[var(--color-text-main)]">{item.name}</span>
                <span className="text-xs text-[var(--color-text-soft)]">{item.relationship}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-20" id="problem">
      <div className="max-w-3xl">
        <p className="section-label">The problem</p>
        <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">AI agents are powerful. But they don&apos;t know your rules.</h2>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {problemItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-background-soft)] text-[var(--color-primary-hover)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <Badge variant="warning">{item.status}</Badge>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.example}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function TourPreview({ step }: { step: (typeof tourSteps)[number] }) {
  const rows: Record<string, string[]> = {
    ingest: ["support-handbook.pdf", "pricing-objections.docx", "refund-policy-v3.md"],
    structure: ["communication_policy.json", "scenario_playbooks.json", "phrase_library.json"],
    govern: ["Legal threat -> approval", "Discount promise -> repair", "Missing source -> block"],
    review: ["Approve", "Repair", "Reject"],
    improve: ["Evaluation drift", "Policy gap", "Reviewer feedback"],
  };
  return (
    <ProductWindow title={`${step.title.toLowerCase()} / operating layer`}>
      <div className="operant-grid-bg min-h-[360px] p-5">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] px-4 py-3">
          <div className="flex items-center gap-2"><step.icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" /><span className="text-sm font-semibold">{step.title}</span></div>
          <Badge variant="accent">Live state</Badge>
        </div>
        <div className="grid gap-3">
          {rows[step.key].map((row) => (
            <div key={row} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white/75 px-4 py-3 text-sm shadow-sm">
              <span>{row}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--color-success)]/10 text-[var(--color-success)]"><Check className="h-4 w-4" aria-hidden="true" /></span>
            </div>
          ))}
        </div>
      </div>
    </ProductWindow>
  );
}

export function StickyProductTour() {
  return (
    <section className="bg-[var(--color-background-soft)] py-20" id="product-tour">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="section-label">Product tour</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">From knowledge to governed agent work.</h2>
          <div className="mt-8 space-y-4">
            {tourSteps.map((step, index) => (
              <div key={step.key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-text-main)] text-xs font-semibold text-[var(--color-background-panel)]">{index + 1}</span>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-8">
          {tourSteps.map((step) => <TourPreview key={step.key} step={step} />)}
        </div>
      </div>
    </section>
  );
}

export function WorkflowCanvas() {
  const nodes = [
    ["Trigger", "Support agent drafts refund response", "12", "14"],
    ["Policy Match", "Refund policy v3 matched", "38", "24"],
    ["Risk Check", "Legal threat detected", "58", "42"],
    ["Repair / Approve", "Manager review required", "38", "62"],
    ["Export / Execute", "Approved draft exported", "68", "70"],
    ["Audit Log", "Decision logged", "84", "38"],
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-20" id="workflow">
      <div className="mb-10 max-w-3xl">
        <p className="section-label">Workflow canvas</p>
        <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">A control plane for agent decisions.</h2>
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4 md:p-8">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true">
          <path className="workflow-dash" d="M18 21 C 30 18, 31 28, 38 31 S 52 41, 58 48 S 45 54, 42 63 S 56 70, 68 72 S 78 48, 84 44" fill="none" stroke="rgba(201,111,58,0.42)" strokeWidth="0.35" />
        </svg>
        <div className="operant-grid-bg relative min-h-[620px] rounded-[1.4rem]">
          {nodes.map(([title, body, left, top], index) => (
            <div key={title} className="absolute w-[230px] max-w-[42vw] rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4 shadow-[0_18px_50px_rgba(36,35,31,0.12)]" style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}>
              <Badge variant={index === 2 ? "warning" : index === 5 ? "success" : "accent"}>{title}</Badge>
              <p className="mt-3 text-sm font-semibold">{body}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-background-soft)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${52 + index * 7}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DifferentiationGrid() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20" id="differentiation">
      <div className="max-w-4xl">
        <p className="section-label">Differentiation</p>
        <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">Built for agent workflows that cannot afford to drift.</h2>
      </div>
      <div className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-2 lg:grid-cols-3">
        {differentiationItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-[var(--color-background-panel)] p-6">
              <Icon className="h-5 w-5 text-[var(--color-primary-hover)]" aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ScenarioCard({ scenario }: { scenario: (typeof scenarioItems)[number] }) {
  const Icon = scenario.icon;
  return (
    <Card className="group overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[var(--color-primary-hover)]"><Icon className="h-5 w-5" aria-hidden="true" /></span><Badge variant="default">{scenario.team}</Badge></div>
          <ArrowRight className="h-4 w-4 text-[var(--color-text-soft)] transition group-hover:translate-x-1" aria-hidden="true" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold leading-tight">{scenario.title}</h3>
      </div>
      <div className="operant-grid-bg p-5">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-xs text-[var(--color-text-soft)]"><span>scenario run</span><span>policy fit 91%</span></div>
          <div className="space-y-2">
            {[scenario.trigger, scenario.policy, scenario.action, scenario.final].map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ScenarioCards() {
  return (
    <section className="bg-[var(--color-background-soft)] py-20" id="scenarios">
      <div className="mx-auto max-w-7xl px-5">
        <div className="max-w-3xl">
          <p className="section-label">Scenario cards</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">Every team gets a governed product moment.</h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {scenarioItems.map((scenario) => <ScenarioCard key={scenario.team} scenario={scenario} />)}
        </div>
      </div>
    </section>
  );
}

export function SecurityPanel() {
  return (
    <section className="bg-[var(--color-dark)] py-20 text-white" id="governance">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="section-label text-[var(--color-primary-soft)]">Security and governance</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">Agents should not operate without boundaries.</h2>
          <p className="mt-5 text-lg leading-8 text-white/62">Operant is designed for permissioned ingestion, review-first workflows, auditability, and customer-owned data posture.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CalendlyButton variant="accent" showIcon />
            <Button asChild variant="secondary" className="border-white/15 bg-white/8 text-white hover:bg-white/12">
              <a href="/security">Open security page</a>
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {governanceItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-5">
                <Icon className="h-5 w-5 text-[var(--color-primary-soft)]" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-8 md:p-12">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[color:var(--color-primary)]/12 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <h2 className="text-4xl font-semibold leading-tight md:text-6xl">Give your AI agents an operating layer.</h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]">See how Operant helps teams govern agent communication, approval, repair, and audit evidence before AI work reaches customers.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CalendlyButton variant="accent" size="lg" />
              <Button asChild variant="secondary" size="lg"><a href="/pricing">View pricing</a></Button>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
            <AuditLogPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
