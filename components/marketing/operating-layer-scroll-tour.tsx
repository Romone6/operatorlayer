"use client";

import type React from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Archive, ClipboardCheck, Layers3, RefreshCcw, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";

import { MiniBar, ProductBrowserFrame, ProductRow, ProductShell } from "@/components/marketing/product-demo-primitives";
import { tourSteps } from "@/components/marketing/operant-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepKey = (typeof tourSteps)[number]["key"];

const stepIcons: Record<StepKey, React.ComponentType<{ className?: string }>> = {
  ingest: Archive,
  structure: Layers3,
  govern: ShieldCheck,
  review: ClipboardCheck,
  improve: RefreshCcw,
};

function IngestModule() {
  const sources = [
    ["Support handbook", "Legal", "Scoped", "Synced"],
    ["Refund tickets", "Support Ops", "PII filtered", "Ingesting"],
    ["Pricing rules", "Sales Ops", "Read-only", "Synced"],
    ["Brand language", "Marketing", "Approved", "Synced"],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
        <p className="text-sm font-semibold">Source registry</p>
        <div className="mt-4 space-y-2">
          {sources.map(([name, owner, scope, status]) => (
            <div key={name} className="grid grid-cols-[1fr_0.75fr_auto] gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] px-3 py-3 text-sm">
              <span className="font-semibold">{name}</span><span className="text-[var(--color-text-muted)]">{owner}</span><span className="rounded-full bg-[var(--color-background-soft)] px-2 py-0.5 text-xs">{status}</span>
              <span className="col-span-full text-xs text-[var(--color-text-soft)]">Scope: {scope} · deletion controls enabled · ingestion audit on</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <ProductRow label="Permission status" value="Admin approved" tone="success" />
        <ProductRow label="PII filter" value="Enabled" tone="success" />
        <ProductRow label="Deletion controls" value="Available" />
        <ProductRow label="Last ingestion audit" value="19:04 system" />
      </div>
    </div>
  );
}

function StructureModule() {
  const files = ["communication_policy.json", "scenario_playbooks.json", "phrase_library.json", "memory_context_files.json", "evaluation_rubric.json"];
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[#24231f] p-4 text-white">
        <p className="text-sm font-semibold text-[var(--color-primary-soft)]">Generated operating files</p>
        <div className="mt-4 space-y-2 font-mono text-sm">
          {files.map((file, index) => (
            <div key={file} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/7 px-3 py-3">
              <span>{file}</span><span className="text-white/48">{[42, 18, 126, 31, 14][index]} rules</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
        <p className="text-sm font-semibold">Source evidence attached</p>
        <div className="mt-4 space-y-3">
          <ProductRow label="Refund Policy v3" value="Support handbook p.18" tone="success" />
          <ProductRow label="Forbidden phrase" value="legal interpretation" tone="warning" />
          <ProductRow label="Review condition" value="legal threat" tone="danger" />
          <ProductRow label="Confidence" value="96%" tone="success" />
        </div>
      </div>
    </div>
  );
}

function GovernModule() {
  const rules = [
    ["Legal threat", "Manager approval", "Blocked"],
    ["Discount promise", "Repair", "Sales Ops"],
    ["Missing source", "Evidence required", "Blocked"],
    ["Renewal risk", "CSM review", "Queued"],
    ["Auto-send", "MVP disabled", "Disabled"],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
        <p className="text-sm font-semibold">Governance rules</p>
        <div className="mt-4 space-y-2">
          {rules.map(([signal, rule, state]) => (
            <div key={signal} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] px-3 py-3 text-sm">
              <span className="font-semibold">{signal}</span><span className="text-[var(--color-text-muted)]">{rule}</span><span className="rounded-full bg-[color:var(--color-danger)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-danger)]">{state}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <MiniBar label="Risk threshold" value={82} tone="danger" />
        <MiniBar label="Tone threshold" value={74} tone="warning" />
        <MiniBar label="Policy fit" value={96} tone="success" />
        <ProductRow label="Auto-send disabled" value="On" tone="danger" />
        <ProductRow label="Export restrictions" value="Evidence required" tone="warning" />
      </div>
    </div>
  );
}

function ReviewModule() {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <div className="rounded-xl border border-[color:var(--color-danger)]/25 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-danger)]">Before draft</p>
          <p className="mt-2 text-base font-semibold">“We are legally required to refund you.”</p>
        </div>
        <div className="rounded-xl border border-[color:var(--color-success)]/25 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">After repair</p>
          <p className="mt-2 text-base font-semibold">“I can escalate this for review after we confirm the order ID.”</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
        <p className="text-sm font-semibold">Review queue</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ProductRow label="Matched policy" value="Refund Policy v3" tone="success" />
          <ProductRow label="Missing context" value="Order ID" tone="warning" />
          <ProductRow label="Export" value="Blocked" tone="danger" />
          <ProductRow label="Reviewer" value="Manager" />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3 text-sm text-[var(--color-text-muted)]">Reviewer comment: request order ID, avoid legal interpretation, and use the approved escalation path.</div>
        <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="secondary">Approve</Button><Button size="sm" variant="accent">Repair</Button><Button size="sm" variant="secondary">Reject</Button></div>
      </div>
    </div>
  );
}

function ImproveModule() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
        <p className="text-sm font-semibold">Audit insights</p>
        <div className="mt-4 space-y-3">
          <ProductRow label="Policy gap repeated" value="8 times" tone="warning" />
          <ProductRow label="Tone repair success" value="91%" tone="success" />
          <ProductRow label="Missing order ID trend" value="Rising" tone="warning" />
          <ProductRow label="Failed review reason" value="Legal phrasing" tone="danger" />
        </div>
      </div>
      <div className="rounded-2xl border border-[color:var(--color-primary)]/28 bg-[color:var(--color-primary)]/8 p-4">
        <p className="text-sm font-semibold">Recommended update</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Add escalation rule for legal threat language.</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">Reviewer feedback suggests updating the refund playbook with a required order-ID check and approved escalation language.</p>
        <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-white/74 p-3 text-sm font-semibold text-[var(--color-primary-hover)]">Draft update ready for policy owner review</div>
      </div>
    </div>
  );
}

function TourScreen({ step }: { step: StepKey }) {
  const modules: Record<StepKey, React.ReactNode> = {
    ingest: <IngestModule />,
    structure: <StructureModule />,
    govern: <GovernModule />,
    review: <ReviewModule />,
    improve: <ImproveModule />,
  };
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, y: 20, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -14, scale: 0.985 }} transition={{ duration: 0.28, ease: "easeOut" }}>
        {modules[step]}
      </motion.div>
    </AnimatePresence>
  );
}

export function OperatingLayerScrollTour() {
  const ref = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const transformed = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 0.8, 1], [0, 0, 1, 2, 3, 4]);

  useMotionValueEvent(transformed, "change", (latest) => {
    if (reduced || manualMode) return;
    const next = Math.max(0, Math.min(tourSteps.length - 1, Math.round(latest)));
    setActiveIndex(next);
  });

  const activeStep = tourSteps[activeIndex];

  return (
    <section id="product-tour" ref={ref} data-testid="product-tour" className="relative border-b border-[var(--color-border)] bg-[var(--color-background-panel)] lg:min-h-[430vh]">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:sticky lg:top-[66px] lg:grid lg:min-h-[calc(100vh-66px)] lg:grid-cols-[0.34fr_0.66fr] lg:items-center lg:gap-10 lg:px-6">
        <div>
          <p className="section-label">Product tour</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl">The operating layer is built in five moves.</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">Scroll through the loop Operant uses to turn company knowledge into governed, reviewable agent output.</p>
          <div className="mt-8 grid gap-2">
            {tourSteps.map((step, index) => {
              const Icon = stepIcons[step.key];
              const isActive = index === activeIndex;
              return (
                <button key={step.key} type="button" onClick={() => { setManualMode(true); setActiveIndex(index); }} className={cn("flex items-start gap-3 rounded-2xl border p-4 text-left transition", isActive ? "border-[var(--color-primary)] bg-[color:var(--color-primary)]/8" : "border-[var(--color-border)] bg-white/62 hover:bg-white")}>
                  <span className={cn("mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl", isActive ? "bg-[var(--color-dark)] text-white" : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]")}><Icon className="h-4 w-4" /></span>
                  <span><span className="block font-semibold">{step.title}</span><span className="mt-1 block text-sm leading-5 text-[var(--color-text-muted)]">{step.body}</span></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-10 lg:mt-0">
          <ProductBrowserFrame title="Operant product tour" route={activeStep.title.toLowerCase()} status="Scroll-linked module">
            <ProductShell>
              <TourScreen step={activeStep.key} />
            </ProductShell>
          </ProductBrowserFrame>
        </div>
      </div>
    </section>
  );
}
