"use client";

/* eslint-disable @next/next/no-img-element -- Logo strip uses external SVG wordmarks from Simple Icons without Next image host config. */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Pause,
  Play,
  Split,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import {
  differentiationItems,
  governanceItems,
  integrationLogos,
  pricingPaths,
  problemItems,
  scenarioItems,
  tourSteps,
} from "@/components/marketing/operant-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HeroTab = "queue" | "policies" | "scenarios" | "audit";
type Tone = "default" | "success" | "warning" | "danger" | "accent";

const heroTabs: Array<{ key: HeroTab; label: string; route: string }> = [
  { key: "queue", label: "Queue", route: "review queue / refund escalation" },
  { key: "policies", label: "Policies", route: "policy objects / source evidence" },
  { key: "scenarios", label: "Scenarios", route: "scenario playbooks / executable flows" },
  { key: "audit", label: "Audit", route: "audit log / decisions" },
];

const policyObjects = [
  ["Refund Policy v3", "Support handbook", "Legal", "96%", "Today", "12 scenarios"],
  ["Legal Threat Escalation", "Legal playbook", "Legal", "91%", "Yesterday", "6 scenarios"],
  ["Pricing Objection Rules", "Revenue enablement", "Sales Ops", "89%", "May 30", "8 scenarios"],
  ["Approved Terminology", "Brand guide", "Marketing", "84%", "May 28", "18 scenarios"],
  ["Renewal Risk Playbook", "CS handbook", "CS Ops", "87%", "May 27", "9 scenarios"],
];

function ProductFrame({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] shadow-[0_28px_90px_rgba(36,35,31,0.14)]", className)}>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#c8c0b2]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#d5bc9e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#9ab09a]" />
        <span className="ml-auto text-xs font-semibold text-[var(--color-text-soft)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ProductRow({
  left,
  right,
  tone = "default",
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white/78 px-3 py-2 text-sm">
      <span className="min-w-0 text-[var(--color-text-main)]">{left}</span>
      {right ? <Badge variant={tone}>{right}</Badge> : null}
    </div>
  );
}

function QueuePanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--color-danger)]/30 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="danger">Risk: High</Badge>
              <h3 className="mt-3 text-2xl font-semibold">Refund response flagged</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                Customer threatens legal action over refund. Agent draft contains legal-risk language and missing order context.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2 text-sm font-semibold">
              Manager Queue
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <ProductRow left="Matched policy" right="Refund Policy v3" tone="success" />
            <ProductRow left="Missing context" right="Order ID" tone="warning" />
            <ProductRow left="Business context" right="refund dispute" />
            <ProductRow left="Export status" right="Blocked" tone="danger" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Policy", "Refund Policy v3 attached"],
            ["Risk", "Legal interpretation detected"],
            ["Repair", "Escalation path suggested"],
          ].map(([label, body]) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">{label}</p>
              <p className="mt-2 text-sm font-semibold leading-5">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
        <p className="text-sm font-semibold">Reviewer action</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          Operant blocks unsafe export until a reviewer approves, repairs, or rejects the draft.
        </p>
        <div className="mt-5 grid gap-2">
          <Button variant="secondary" className="justify-start">Approve with evidence</Button>
          <Button variant="accent" className="justify-start">Repair draft</Button>
          <Button variant="secondary" className="justify-start">Reject output</Button>
        </div>
        <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Suggested repair</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Acknowledge issue, avoid legal interpretation, request the order ID, and provide the approved escalation path.
          </p>
        </div>
      </aside>
    </div>
  );
}

function PoliciesPanel() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-3 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)] max-lg:hidden">
        <span>Policy</span><span>Source</span><span>Owner</span><span>Coverage</span><span>Updated</span><span>Status</span>
      </div>
      {policyObjects.map(([name, source, owner, coverage, updated, scenarios]) => (
        <div key={name} className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-white/78 p-4 text-sm lg:grid-cols-[1.2fr_1fr_0.7fr_0.7fr_0.7fr_0.8fr] lg:items-center">
          <div>
            <p className="font-semibold">{name}</p>
            <p className="mt-1 text-xs text-[var(--color-text-soft)]">{scenarios}</p>
          </div>
          <p className="text-[var(--color-text-muted)]">{source}</p>
          <p>{owner}</p>
          <Badge variant="accent">{coverage}</Badge>
          <p className="text-[var(--color-text-muted)]">{updated}</p>
          <Badge variant="success">Active</Badge>
        </div>
      ))}
    </div>
  );
}

function ScenariosPanel() {
  const scenarios = [
    ["Refund escalation", "Legal threat language detected", "Refund Policy v3 + Legal Escalation Rule", "Manager approval required", "Blocked until approved"],
    ["Pricing objection", "Unapproved discount promise", "Pricing Objection Rules", "Sales ops review", "Repair ready"],
    ["Renewal-risk message", "Churn-sensitive wording", "Renewal Risk Playbook", "CSM manager review", "Needs QBR note"],
    ["Cross-team status update", "Unsupported completion claim", "Operating Cadence Rules", "Owner required", "Context required"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {scenarios.map(([name, trigger, policy, review, exportState]) => (
        <div key={name} className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{name}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Executable playbook</p>
            </div>
            <Badge variant={exportState.includes("Blocked") ? "danger" : "warning"}>{exportState}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            <ProductRow left="Trigger" right={trigger} />
            <ProductRow left="Matched policy" right={policy} tone="success" />
            <ProductRow left="Review rule" right={review} tone="warning" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditPanel() {
  const logs = [
    ["19:04", "System", "Policy match", "refund-policy-v3"],
    ["19:04", "System", "Risk detected", "legal threat"],
    ["19:05", "Operant", "Review route", "manager queue"],
    ["19:07", "Operant", "Repair suggested", "legal language removed"],
    ["19:08", "Operant", "Export blocked", "approval missing"],
    ["19:10", "Manager", "Decision logged", "manager approved"],
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-3">
      <div className="grid gap-2">
        {logs.map(([time, actor, event, detail], index) => (
          <motion.div
            key={`${time}-${event}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.055 }}
            className="grid grid-cols-[58px_82px_1fr_auto] items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] px-3 py-3 text-sm max-md:grid-cols-1"
          >
            <span className="text-[var(--color-text-soft)]">{time}</span>
            <Badge variant={actor === "Manager" ? "success" : "default"}>{actor}</Badge>
            <span className="font-semibold">{event}</span>
            <span className="text-[var(--color-text-muted)]">{detail}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HeroPanel({ active }: { active: HeroTab }) {
  const panels = {
    queue: <QueuePanel />,
    policies: <PoliciesPanel />,
    scenarios: <ScenariosPanel />,
    audit: <AuditPanel />,
  };
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={active} initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.24 }}>
        {panels[active]}
      </motion.div>
    </AnimatePresence>
  );
}

export function InteractiveHeroProductDemo() {
  const [active, setActive] = useState<HeroTab>("queue");
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (paused || manual || reduced) return;
    const interval = window.setInterval(() => {
      setActive((current) => heroTabs[(heroTabs.findIndex((tab) => tab.key === current) + 1) % heroTabs.length].key);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [manual, paused, reduced]);

  const route = heroTabs.find((tab) => tab.key === active)?.route ?? heroTabs[0].route;

  return (
    <ProductFrame title={route} className="w-full lg:-mr-12 xl:-mr-20">
      <div className="grid min-h-[680px] grid-cols-[190px_1fr] max-md:grid-cols-1" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <aside className="border-r border-[var(--color-border)] bg-[var(--color-background-soft)] p-5 max-md:border-b max-md:border-r-0">
          <div className="mb-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">
            <span>Workspace</span>
            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[var(--color-success)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />live</span>
          </div>
          <div className="grid gap-2 max-md:grid-cols-4">
            {heroTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActive(tab.key); setManual(true); }}
                className={cn("rounded-xl px-3 py-3 text-left text-sm font-semibold transition max-md:text-center", active === tab.key ? "bg-white text-[var(--color-text-main)] shadow-sm" : "text-[var(--color-text-muted)] hover:bg-white/60")}
                aria-pressed={active === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-white/60 p-3 text-xs leading-5 text-[var(--color-text-muted)] max-md:hidden">
            <p className="font-semibold text-[var(--color-text-main)]">Loop</p>
            <p>Draft {"->"} policy {"->"} risk {"->"} review {"->"} repair/export {"->"} audit.</p>
          </div>
        </aside>
        <main className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-5">
            <div>
              <p className="text-base font-semibold">Acme Support Workspace</p>
              <p className="text-sm text-[var(--color-text-soft)]">{route}</p>
            </div>
            <button type="button" onClick={() => { setManual(false); setPaused((value) => !value); }} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)]">
              {paused || manual ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {manual ? "Resume loop" : paused ? "Paused" : "Auto loop"}
            </button>
          </div>
          <HeroPanel active={active} />
        </main>
      </div>
    </ProductFrame>
  );
}

export function InfiniteLogoMarquee() {
  const items = useMemo(() => [...integrationLogos, ...integrationLogos], []);
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-background-panel)] py-10">
      <h2 className="text-center text-sm font-semibold text-[var(--color-text-muted)]">Works with the tools modern teams already use</h2>
      <div className="logo-marquee-mask mt-8 overflow-hidden" aria-label="Integration ecosystem logos">
        <div className="logo-marquee-track flex w-max items-center gap-16 pr-16">
          {items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="inline-flex items-center gap-3 opacity-55 grayscale transition hover:opacity-80">
              {/* Relationship is tracked in data; visible copy stays ecosystem-only. */}
              <img src={item.logo} alt={item.name} className="h-7 w-7 object-contain" loading="lazy" />
              <span className="text-2xl font-semibold tracking-[-0.05em] text-[#8a857a]">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StackPositionDiagram() {
  const sources = ["Policies", "Docs", "Playbooks", "Tickets", "CRM notes"];
  const outputs = ["Support agents", "Sales copilots", "Internal workflows", "Approved exports"];
  return (
    <section className="mx-auto max-w-7xl px-5 py-24" id="stack-position">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="section-label">Where Operant sits</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">Between agent output and business risk.</h2>
          <p className="mt-5 text-base leading-8 text-[var(--color-text-muted)]">
            Operant is not another dashboard beside your agents. It is the policy, review, evaluation, and audit layer between company knowledge and the work agents try to export.
          </p>
        </div>
        <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-5 shadow-[0_28px_90px_rgba(36,35,31,0.1)]">
          <div className="grid gap-5">
            <div className="grid gap-3 md:grid-cols-5">{sources.map((source) => <div key={source} className="rounded-2xl border border-[var(--color-border)] bg-white/75 p-3 text-center text-sm font-semibold">{source}</div>)}</div>
            <div className="flex justify-center"><ArrowDown className="h-6 w-6 text-[var(--color-primary)]" /></div>
            <div className="relative overflow-hidden rounded-3xl border border-[var(--color-primary)] bg-[var(--color-dark)] p-6 text-white">
              <div className="absolute inset-0 operant-grid-bg opacity-10" />
              <div className="relative grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary-soft)]">Operant control layer</p>
                  <h3 className="mt-2 text-2xl font-semibold">Check, repair, approve, block, log.</h3>
                </div>
                <Split className="mx-auto h-8 w-8 text-[var(--color-primary-soft)]" />
                <div className="grid gap-2 text-sm text-white/72">
                  <p>Policy match + source evidence</p>
                  <p>Risk, tone, context, compliance scoring</p>
                  <p>Human review gates + export decisions</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center"><ArrowDown className="h-6 w-6 text-[var(--color-primary)]" /></div>
            <div className="grid gap-3 md:grid-cols-4">{outputs.map((output) => <div key={output} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3 text-center text-sm font-semibold">{output}</div>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AgentFailureBoard() {
  const [active, setActive] = useState(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setActive((value) => (value + 1) % problemItems.length), 2400);
    return () => window.clearInterval(interval);
  }, [reduced]);

  const activeItem = problemItems[active];

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.78fr_1.22fr]" id="problem">
      <div className="lg:pt-10">
        <p className="section-label">Before Operant</p>
        <h2 className="editorial-heading mt-3 text-4xl font-semibold leading-tight md:text-6xl">AI agents are powerful. But they don&apos;t know your rules.</h2>
        <p className="mt-5 text-base leading-8 text-[var(--color-text-muted)]">This is what breaks when agents draft customer-facing work without company policy, context, approvals, and auditability.</p>
        <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-soft)]">Active failure</p>
          <h3 className="mt-3 text-2xl font-semibold">{activeItem.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{activeItem.example}</p>
        </div>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-4">
          <p className="text-base font-semibold">Agent failure inbox</p>
          <Badge variant="warning">6 unresolved</Badge>
        </div>
        <div className="grid gap-3 p-4">
          {problemItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={item.title} type="button" onClick={() => setActive(index)} className={cn("grid gap-4 rounded-2xl border p-4 text-left transition md:grid-cols-[1fr_1fr_0.9fr]", active === index ? "border-[var(--color-primary)] bg-[color:var(--color-primary)]/8 shadow-sm" : "border-[var(--color-border)] bg-white/65 hover:bg-white")}>
                <div className="flex gap-3">
                  <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--color-primary-hover)]" />
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <Badge variant={active === index ? "warning" : "default"} className="mt-2">{item.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Example</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{item.example}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">Operant fix</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-main)]">{item.fix}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

function IngestScreen() {
  return (
    <ProductFrame title="Source registry / permissioned ingestion">
      <div className="grid min-h-[560px] gap-5 p-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {[
            ["Support handbook.pdf", "Legal", "approved", "synced 12m ago"],
            ["Refund policy v3.md", "Support Ops", "approved", "source audit on"],
            ["Conversation export", "Support", "scoped", "PII filter applied"],
            ["CRM renewal notes", "CS Ops", "pending", "owner review"],
          ].map(([name, owner, status, sync]) => (
            <ProductRow key={name} left={<span><span className="font-semibold">{name}</span><span className="ml-2 text-[var(--color-text-soft)]">owner: {owner}</span></span>} right={`${status} / ${sync}`} tone={status === "pending" ? "warning" : "success"} />
          ))}
        </div>
        <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
          <p className="font-semibold">Source controls</p>
          <div className="mt-4 space-y-3 text-sm">
            <ProductRow left="Deletion controls" right="on" tone="success" />
            <ProductRow left="Scope" right="support" />
            <ProductRow left="Ingestion audit" right="on" tone="success" />
          </div>
        </aside>
      </div>
    </ProductFrame>
  );
}

function StructureScreen() {
  return (
    <ProductFrame title="Compiler / generated operating objects">
      <div className="grid min-h-[560px] gap-5 p-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          {["communication_policy.json", "scenario_playbooks.json", "phrase_library.json", "memory_context_files.json", "evaluation_rubric.json"].map((name, index) => (
            <ProductRow key={name} left={name} right={`${42 - index * 5} rules`} tone="accent" />
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
          <p className="font-semibold">Source evidence attached</p>
          <div className="mt-4 space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>Refund Policy v3 {"->"} support handbook lines 18-42</p>
            <p>Legal escalation {"->"} legal playbook section 4</p>
            <p>Approved terms {"->"} brand guide glossary</p>
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function GovernScreen() {
  return (
    <ProductFrame title="Governance rules / export restrictions">
      <div className="grid min-h-[560px] gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {["Legal threat -> manager approval", "Discount promise -> repair", "Missing source -> block export", "Renewal risk -> CSM review", "Auto-send -> disabled"].map((rule, index) => (
            <ProductRow key={rule} left={rule} right={index === 4 ? "disabled" : index < 2 ? "approval" : "block"} tone={index === 4 ? "danger" : "warning"} />
          ))}
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
          <p className="font-semibold">Thresholds</p>
          <div className="mt-5 space-y-4">
            {[
              ["Risk", 86],
              ["Tone", 71],
              ["Policy fit", 94],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-sm"><span>{label}</span><span>{value}</span></div>
                <div className="mt-2 h-2 rounded-full bg-white"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProductFrame>
  );
}

function ReviewScreen() {
  return (
    <ProductFrame title="Review queue / evidence in view">
      <div className="grid min-h-[560px] gap-5 p-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/75 p-5">
          <Badge variant="danger">Before</Badge>
          <p className="mt-4 text-xl font-semibold leading-8">We are legally required to refund you.</p>
          <ProductRow left="Missing context" right="Order ID" tone="warning" />
          <div className="mt-3"><ProductRow left="Matched policy" right="Refund Policy v3" tone="success" /></div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
          <Badge variant="success">After repair</Badge>
          <p className="mt-4 text-xl font-semibold leading-8">I can escalate this for review. Please share the order ID so we can follow the approved refund path.</p>
          <div className="mt-5 grid grid-cols-3 gap-2"><Button variant="secondary">Approve</Button><Button variant="accent">Repair</Button><Button variant="secondary">Reject</Button></div>
        </div>
      </div>
    </ProductFrame>
  );
}

function ImproveScreen() {
  return (
    <ProductFrame title="Audit insights / policy improvement">
      <div className="grid min-h-[560px] gap-5 p-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">{["Refund policy gap repeated 8 times", "Tone repair success 91%", "Missing order ID trend", "Reviewer feedback suggests escalation update"].map((row) => <ProductRow key={row} left={row} right="review" tone="accent" />)}</div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
          <p className="font-semibold">Recommended update</p>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">Add a refund-dispute scenario requiring order ID collection before any escalation language can export.</p>
        </div>
      </div>
    </ProductFrame>
  );
}

function TourScreen({ stepKey }: { stepKey: (typeof tourSteps)[number]["key"] }) {
  const screens = { ingest: <IngestScreen />, structure: <StructureScreen />, govern: <GovernScreen />, review: <ReviewScreen />, improve: <ImproveScreen /> };
  return screens[stepKey];
}

export function ScrollDrivenProductTour() {
  const [active, setActive] = useState<(typeof tourSteps)[number]["key"]>("ingest");
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target instanceof HTMLElement) setActive(visible.target.dataset.step as typeof active);
    }, { threshold: [0.35, 0.55, 0.75], rootMargin: "-25% 0px -35% 0px" });
    refs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, []);

  const step = tourSteps.find((item) => item.key === active) ?? tourSteps[0];

  return (
    <section className="bg-[var(--color-background-soft)] py-24" id="product-tour" data-testid="product-tour">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <p className="section-label">Product tour</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">A guided walkthrough of the operating layer.</h2>
          <div className="mt-8 grid gap-2">
            {tourSteps.map((item, index) => (
              <button key={item.key} type="button" onClick={() => setActive(item.key)} className={cn("rounded-2xl border p-4 text-left transition", active === item.key ? "border-[var(--color-primary)] bg-[var(--color-background-panel)] shadow-sm" : "border-[var(--color-border)] bg-white/50 hover:bg-white")}>
                <span className="text-xs font-semibold text-[var(--color-text-soft)]">0{index + 1}</span>
                <p className="mt-1 font-semibold">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.body}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="sticky top-24 z-10"><AnimatePresence mode="wait"><motion.div key={step.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.24 }}><TourScreen stepKey={step.key} /></motion.div></AnimatePresence></div>
          <div className="hidden lg:block">{tourSteps.map((item, index) => <div key={item.key} ref={(node) => { refs.current[index] = node; }} data-step={item.key} className="h-[520px]" aria-hidden="true" />)}</div>
        </div>
      </div>
    </section>
  );
}

export function GovernedExportWorkflow() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const nodes = [
    { title: "Agent draft", body: "Customer-facing refund response", detail: "Draft contains legal-risk phrasing" },
    { title: "Policy retrieved", body: "Refund Policy v3", detail: "Source: Support handbook / Owner: Legal" },
    { title: "Risk scored", body: "Risk 86 / Tone 71 / Context missing", detail: "Missing: Order ID" },
    { title: "Human review", body: "Manager queue required", detail: "Approve / Repair / Reject" },
    { title: "Export state", body: "Blocked until approval", detail: "Destination: Support agent workspace" },
    { title: "Audit log", body: "Decision written", detail: "19:08 export blocked" },
  ];

  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setActive((value) => (value + 1) % nodes.length), 1700);
    return () => window.clearInterval(interval);
  }, [nodes.length, reduced]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-24" id="workflow">
      <div className="mb-10 max-w-3xl">
        <p className="section-label">Workflow machine</p>
        <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">The exact path from draft to governed export.</h2>
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-5 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/75 p-5">
              <Badge variant="danger">Before</Badge>
              <p className="mt-3 text-xl font-semibold leading-8">We are legally required to refund you.</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
              <Badge variant="success">After repair</Badge>
              <p className="mt-3 text-xl font-semibold leading-8">I can escalate this for review after we confirm the order ID.</p>
            </div>
          </div>
          <div className="operant-grid-bg rounded-[1.4rem] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              {nodes.map((node, index) => (
                <button key={node.title} type="button" onClick={() => setActive(index)} className={cn("relative rounded-2xl border p-4 text-left transition", active === index ? "border-[var(--color-primary)] bg-white shadow-[0_18px_60px_rgba(201,111,58,0.18)]" : "border-[var(--color-border)] bg-white/75")}>
                  <Badge variant={active === index ? "accent" : "default"}>{index + 1}. {node.title}</Badge>
                  {index < nodes.length - 1 ? <ArrowRight className="absolute -right-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[var(--color-primary)] md:block" /> : null}
                  <h3 className="mt-4 text-lg font-semibold">{node.body}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{node.detail}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-background-soft)]">
                    <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: active >= index ? "100%" : "14%" }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniVisual({ kind }: { kind: "review" | "policy" | "audit" }) {
  if (kind === "review") {
    return (
      <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
        <ProductRow left="Export" right="Blocked" tone="danger" />
        <div className="mt-2"><ProductRow left="Reviewer" right="Manager" tone="warning" /></div>
      </div>
    );
  }
  if (kind === "policy") {
    return (
      <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
        <ProductRow left="Refund Policy v3" right="attached" tone="success" />
        <div className="mt-2"><ProductRow left="Source" right="handbook" /></div>
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4">
      <ProductRow left="Repair" right="logged" tone="success" />
      <div className="mt-2"><ProductRow left="Approval" right="logged" tone="success" /></div>
    </div>
  );
}

export function DifferentiationHierarchy() {
  const top = [
    { ...differentiationItems.find((item) => item.title === "Review-before-send")!, kind: "review" as const },
    { ...differentiationItems.find((item) => item.title === "Policy-backed outputs")!, kind: "policy" as const },
    { ...differentiationItems.find((item) => item.title === "Audit history")!, kind: "audit" as const },
  ];
  const secondary = differentiationItems.filter((item) => !top.some((major) => major.title === item.title));

  return (
    <section className="mx-auto max-w-7xl px-5 py-24" id="differentiation">
      <div className="max-w-4xl">
        <p className="section-label">Differentiation</p>
        <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">Built for agent workflows that cannot afford to drift.</h2>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {top.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-6">
              <Icon className="h-5 w-5 text-[var(--color-primary-hover)]" />
              <h3 className="mt-5 text-2xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{item.body}</p>
              <MiniVisual kind={item.kind} />
            </Card>
          );
        })}
      </div>
      <div className="mt-5 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-3">
        {secondary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-[var(--color-background-panel)] p-5">
              <Icon className="h-4 w-4 text-[var(--color-primary-hover)]" />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ScenarioModal({ index, onClose }: { index: number | null; onClose: () => void }) {
  if (index === null) return null;
  const scenario = scenarioItems[index];
  const steps = [
    ["Incoming draft", scenario.before],
    ["Detected", scenario.detected],
    ["Matched policy", scenario.policy],
    ["Risk/context", `Risk: ${scenario.risk}. Missing context: ${scenario.missing}.`],
    ["Operant action", scenario.action],
    ["Final export", scenario.after],
    ["Audit log", scenario.audit],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[1.7rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] p-6">
          <div>
            <Badge variant="accent">{scenario.team}</Badge>
            <h3 className="mt-3 text-3xl font-semibold">{scenario.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{scenario.problem}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--color-border)] p-2" aria-label="Close scenario workflow"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(([label, body], stepIndex) => (
            <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white/72 p-4">
              <Badge variant={stepIndex === 3 ? "warning" : stepIndex === 5 ? "success" : "default"}>{stepIndex + 1}. {label}</Badge>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScenarioWorkflowDemos() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="bg-[var(--color-background-soft)] py-24" id="scenarios">
      <div className="mx-auto max-w-7xl px-5">
        <div className="max-w-3xl">
          <p className="section-label">Scenario demos</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">Open a real workflow moment.</h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {scenarioItems.map((scenario, index) => {
            const Icon = scenario.icon;
            return (
              <button key={scenario.team} type="button" onClick={() => setSelected(index)} className="group rounded-[1.5rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                <Card className="h-full overflow-hidden p-0 transition group-hover:-translate-y-1 group-hover:border-[var(--color-primary)]">
                  <div className="border-b border-[var(--color-border)] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[var(--color-primary-hover)]"><Icon className="h-5 w-5" /></span>
                        <Badge>{scenario.team}</Badge>
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-hover)]">View workflow <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold leading-tight">{scenario.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{scenario.problem}</p>
                  </div>
                  <div className="grid gap-3 p-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white/72 p-4">
                      <Badge variant="danger">Before</Badge>
                      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{scenario.before}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                      <Badge variant={scenario.risk === "High" ? "danger" : "warning"}>{scenario.risk} risk</Badge>
                      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{scenario.detected}</p>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
      <ScenarioModal index={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

export function GovernanceArchitectureSection() {
  const matrix = [
    ["Legal threat", "Manager approval", "blocked"],
    ["Refund exception", "Policy + order ID", "blocked"],
    ["Discount promise", "Sales ops review", "repair"],
    ["Missing source", "Evidence required", "blocked"],
    ["Auto-send", "MVP disabled", "disabled"],
  ];

  return (
    <section className="bg-[var(--color-dark)] py-24 text-white" id="governance">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="section-label text-[var(--color-primary-soft)]">Governance architecture</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">Agents should not operate without boundaries.</h2>
          <p className="mt-5 text-base leading-8 text-white/64">Operant makes the boundary visible: source evidence attached, risky exports blocked, human review required, and every decision written to the audit trail.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CalendlyButton variant="accent" showIcon />
            <Button asChild variant="secondary" className="border-white/15 bg-white/8 text-white hover:bg-white/12"><a href="/security">Open security page</a></Button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold">Approval gate matrix</p>
              <Badge variant="danger">auto-send disabled</Badge>
            </div>
            <div className="mt-5 space-y-2">
              {matrix.map(([signal, control, state]) => (
                <div key={signal} className="grid grid-cols-[1fr_1fr_auto] gap-3 rounded-xl border border-white/10 bg-white/6 px-3 py-3 text-sm max-sm:grid-cols-1">
                  <span>{signal}</span>
                  <span className="text-white/64">{control}</span>
                  <Badge variant={state === "disabled" ? "danger" : state === "repair" ? "warning" : "default"}>{state}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
            <p className="text-lg font-semibold">Security event log</p>
            <div className="mt-5 space-y-3 text-sm text-white/66">
              <p>19:04 source evidence attached</p>
              <p>19:05 legal escalation gate applied</p>
              <p>19:07 manager queue assigned</p>
              <p>19:08 export blocked until approval</p>
              <p>19:10 approval logged</p>
            </div>
          </div>
          <div className="grid gap-3 lg:col-span-2 sm:grid-cols-4">
            {governanceItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <Icon className="h-4 w-4 text-[var(--color-primary-soft)]" />
                  <h3 className="mt-3 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/58">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RolloutPathTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20" id="pricing-preview">
      <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
        <div>
          <p className="section-label">Rollout paths</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">Start with the operating problem, then choose the rollout path.</h2>
        </div>
        <p className="text-base leading-8 text-[var(--color-text-muted)]">Use Operant first to validate policy compilation, then govern live review queues, then scale into connector-backed controls and audit evidence.</p>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {pricingPaths.map((path) => (
          <Card key={path.name} className={cn("p-6", path.highlighted ? "border-[var(--color-primary)] shadow-[0_22px_70px_rgba(201,111,58,0.16)]" : "")}>
            <h3 className="text-3xl font-semibold">{path.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{path.description}</p>
            <ul className="mt-6 space-y-2 text-sm text-[var(--color-text-muted)]">
              {path.features.map((feature) => (
                <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-[var(--color-success)]" />{feature}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary"><a href="/pricing">View pricing</a></Button>
        <CalendlyButton variant="accent" />
      </div>
    </section>
  );
}

export function DesignPartnerCTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-18">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-8 shadow-[0_28px_90px_rgba(36,35,31,0.1)] md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="section-label">Design partners</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">Building with teams that need governed AI workflows.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-muted)]">Operant is opening design-partner conversations with teams deploying AI agents across support, sales, customer success, and operations.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CalendlyButton variant="accent" label="Apply for design partner access" />
              <CalendlyButton variant="secondary" label="Book a demo" />
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
            <ProductRow left="Support" right="review gates" tone="success" />
            <div className="mt-2"><ProductRow left="Sales" right="pricing rules" tone="success" /></div>
            <div className="mt-2"><ProductRow left="Operations" right="audit trail" tone="success" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-8 md:p-12">
        <div className="relative grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <h2 className="text-4xl font-semibold leading-tight md:text-5xl">Give your AI agents an operating layer.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-text-muted)]">See how Operant checks agent output against policy, routes risk to review, repairs weak drafts, blocks unsafe export, and logs every decision.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CalendlyButton variant="accent" size="lg" />
              <Button asChild variant="secondary" size="lg"><a href="/product">Explore product</a></Button>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
            <AuditPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
