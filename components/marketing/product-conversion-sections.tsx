"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, GitBranch, ShieldAlert, Workflow } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { HeroProductFilm } from "@/components/marketing/hero-product-film";
import { ProductDataTable, ProductStatus } from "@/components/marketing/product-demo-primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adoptionStages = [
  {
    title: "Internal agent testing",
    happening: "Teams test agent drafts against uploaded policies.",
    breaks: "Prompt instructions drift from approved docs.",
    adds: "Source registry, policy extraction, playground evaluation.",
    modules: ["Sources", "Policies", "Playground"],
  },
  {
    title: "Review queue rollout",
    happening: "Agents draft customer-facing work, but humans still approve it.",
    breaks: "Reviewers fix the same issues without reusable evidence.",
    adds: "Risk scoring, matched evidence, repair suggestions, reviewer actions.",
    modules: ["Queue", "Scenarios", "Repair"],
  },
  {
    title: "Customer-facing governance",
    happening: "AI-assisted replies move toward customer delivery.",
    breaks: "Legal, refund, pricing, and missing-source risks reach customers.",
    adds: "Approval gate matrix, export block, audit log, destination state.",
    modules: ["Governance", "Exports", "Audit"],
  },
  {
    title: "Enterprise control layer",
    happening: "Multiple teams need different rules without losing central control.",
    breaks: "Every tool carries its own incomplete version of policy.",
    adds: "Team rules, connector setup states, source controls, procurement evidence.",
    modules: ["Team rules", "Security", "Evidence"],
  },
];

const assessment = {
  teams: ["Support", "Sales", "CS", "Operations"],
  risks: ["legal language", "pricing promise", "missing source", "renewal risk"],
  outputs: ["support reply", "sales email", "internal update", "approved export"],
};

export function ProductFilmSection() {
  return (
    <section className="overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-dark)] py-20 text-white">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:items-center">
          <div>
            <p className="section-label text-[var(--color-primary-soft)]">Product film</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">Watch an unsafe agent draft become a governed export decision.</h2>
            <p className="mt-5 text-lg leading-8 text-white/64">Draft enters, policy attaches, evidence is shown, risk is scored, export is blocked, a reviewer repairs the response, and the audit record is written.</p>
          </div>
          <HeroProductFilm className="min-h-[540px] border-white/12 xl:min-h-[650px]" />
        </div>
      </div>
    </section>
  );
}

export function OldWayNewWayContrast() {
  const oldRows = [
    ["Agent behavior", "Prompt-only instructions"],
    ["Source evidence", "Scattered docs and Slack memory"],
    ["Approval", "Manual review when someone remembers"],
    ["Risk", "Legal-risk replies can reach customers"],
    ["Audit", "No durable decision record"],
  ];
  const newRows = [
    ["Policy match", "Refund Policy v3 attached"],
    ["Source evidence", "Line-level owner and condition shown"],
    ["Risk scoring", "Legal language and missing context scored"],
    ["Review gate", "Manager queue required"],
    ["Audit", "Decision, repair, approval, and export logged"],
  ];

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background)] py-20">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="max-w-5xl">
          <p className="section-label">Old way vs Operant way</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">Every output is checked, repaired, approved, blocked, or logged.</h2>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_120px_1fr] lg:items-stretch">
          <div className="rounded-xl border border-[color:var(--color-danger)]/25 bg-white p-5">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
              <ShieldAlert className="h-5 w-5 text-[var(--color-danger)]" />
              <h3 className="text-2xl font-semibold tracking-[-0.05em]">Old way: agents generate work without company rules.</h3>
            </div>
            <div className="mt-5"><ProductDataTable columns={["Area", "What happens"]} rows={oldRows} /></div>
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <div className="grid place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-dark)] p-5 text-center text-white shadow-[0_22px_80px_rgba(31,30,26,0.22)]">
              <GitBranch className="h-7 w-7 text-[var(--color-primary-soft)]" />
              <p className="mt-3 text-sm font-semibold">Operant control layer</p>
            </div>
          </div>
          <div className="rounded-xl border border-[color:var(--color-success)]/30 bg-[var(--color-dark)] p-5 text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <CheckCircle2 className="h-5 w-5 text-[var(--color-primary-soft)]" />
              <h3 className="text-2xl font-semibold tracking-[-0.05em]">Operant way: export decisions are governed.</h3>
            </div>
            <div className="mt-5"><ProductDataTable dark columns={["Control", "What happens"]} rows={newRows} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdoptionStageSelector() {
  const [active, setActive] = useState(1);
  const stage = adoptionStages[active];
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background-panel)] py-20">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:items-end">
          <div>
            <p className="section-label">Adoption path</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl">Built for teams at every stage of agent deployment.</h2>
          </div>
          <p className="text-lg leading-8 text-[var(--color-text-muted)]">Start with the workflow maturity you have today. Operant shows what breaks, which controls matter, and which modules become relevant next.</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-[0.33fr_0.67fr]">
          <div className="grid gap-2">
            {adoptionStages.map((item, index) => (
              <button key={item.title} type="button" onClick={() => setActive(index)} className={cn("rounded-lg border p-4 text-left transition", active === index ? "border-[var(--color-primary)] bg-[color:var(--color-primary)]/10" : "border-[var(--color-border)] bg-white/72 hover:bg-white")}>
                <span className="block text-sm font-semibold text-[var(--color-text-soft)]">Stage {index + 1}</span>
                <span className="mt-1 block text-xl font-semibold tracking-[-0.04em]">{item.title}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={stage.title} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[0_22px_80px_rgba(36,35,31,0.1)]">
              <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <ProductDataTable
                  columns={["Question", "Answer"]}
                  rows={[
                    ["What the team is doing", stage.happening],
                    ["What breaks without Operant", stage.breaks],
                    ["What Operant adds", stage.adds],
                  ]}
                />
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
                  <p className="font-semibold">Relevant modules</p>
                  <div className="mt-4 grid gap-2">
                    {stage.modules.map((module) => <ProductStatus key={module} label={module} tone="accent" />)}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <CalendlyButton label="Book a demo" variant="accent" />
                    <Button asChild variant="secondary"><Link href="#workflow-assessment">Map workflow</Link></Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export function WorkflowAssessmentCTA() {
  const [team, setTeam] = useState(0);
  const [risk, setRisk] = useState(0);
  const [output, setOutput] = useState(0);
  return (
    <section id="workflow-assessment" className="border-b border-[var(--color-border)] bg-[#eee9dd] py-20">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="grid gap-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-6 shadow-[0_30px_100px_rgba(36,35,31,0.14)] md:p-8 lg:grid-cols-[0.42fr_0.58fr]">
          <div>
            <p className="section-label">Workflow assessment</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl">Map your first governed agent workflow.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">Choose a team, risk, and output. Operant shows the setup needed for a real review queue and routes the CTA to demo booking.</p>
            <div className="mt-8 flex flex-wrap gap-3"><CalendlyButton label="Map this workflow" variant="accent" size="lg" /><CalendlyButton label="Book a demo" variant="secondary" size="lg" /></div>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-white p-5">
            {[
              ["Team using agents", assessment.teams, team, setTeam],
              ["Risk type", assessment.risks, risk, setRisk],
              ["Output destination", assessment.outputs, output, setOutput],
            ].map(([label, options, selected, setter]) => (
              <div key={label as string} className="mb-5 last:mb-0">
                <p className="mb-2 text-sm font-semibold">{label as string}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(options as string[]).map((option, index) => (
                    <button key={option} type="button" onClick={() => (setter as (value: number) => void)(index)} className={cn("rounded-md border px-3 py-2 text-left text-sm font-semibold transition", selected === index ? "border-[var(--color-primary)] bg-[color:var(--color-primary)]/10 text-[var(--color-primary-hover)]" : "border-[var(--color-border)] bg-[var(--color-background-soft)] text-[var(--color-text-muted)]")}>{option}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-dark)] p-4 text-white">
              <p className="text-sm font-semibold text-[var(--color-primary-soft)]">Recommended Operant workflow</p>
              <ProductDataTable
                dark
                columns={["Setup", "Required"]}
                rows={[
                  ["Team", assessment.teams[team]],
                  ["Policy source", `${assessment.risks[risk]} rule source`],
                  ["Review queue", "Human owner required"],
                  ["Export control", `${assessment.outputs[output]} blocked until approved`],
                  ["Audit evidence", "Policy match, repair, reviewer, export state"],
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HumanProofReadySection() {
  const reduced = useReducedMotion();
  const rows = ["Support teams ask for refund escalation gates", "Sales teams ask for pricing-promise repair", "CS teams ask for renewal-risk review", "Ops teams ask for audit trails on internal updates"];
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background-panel)] py-20">
      <div className="mx-auto grid max-w-[1560px] gap-8 px-5 lg:grid-cols-[0.38fr_0.62fr] lg:items-center lg:px-10 xl:px-12">
        <div>
          <p className="section-label">Proof-ready workflow examples</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl">No fake customers. Real proof slots are ready when design partners approve them.</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">Until real customer quotes and metrics exist, the page shows the workflow problems teams bring to Operant instead of fabricated logos or numbers.</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-dark)] p-5 text-white">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <ClipboardCheck className="h-5 w-5 text-[var(--color-primary-soft)]" />
            <p className="font-semibold">What teams ask us to govern</p>
          </div>
          <div className="mt-4 grid gap-3">
            {rows.map((row, index) => (
              <motion.div key={row} initial={reduced ? false : { opacity: 0, y: 8 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="grid grid-cols-[32px_1fr] items-center gap-3 rounded-lg border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/78">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-white/10 text-xs font-bold">{index + 1}</span>
                {row}
              </motion.div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button asChild variant="secondary" className="border-white/15 bg-white/8 text-white hover:bg-white/12"><Link href="#workflow-assessment">Map your workflow <Workflow className="ml-2 h-4 w-4" /></Link></Button>
            <CalendlyButton label="Book a demo" variant="accent" />
          </div>
        </div>
      </div>
    </section>
  );
}
