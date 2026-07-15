"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ClipboardCheck, LineChart, MessageSquare, Users, Workflow } from "lucide-react";
import Link from "next/link";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { Button } from "@/components/ui/button";

const programs = [
  ["Support", "review gates", MessageSquare],
  ["Sales", "pricing rules", LineChart],
  ["Operations", "audit trail", Workflow],
  ["Customer Success", "renewal-risk playbooks", Users],
] as const;
const timeline = ["Map workflows", "Compile policy", "Run review queue", "Measure audit evidence"];

export function DesignPartnerCTA() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[#eee9dd] py-24">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="grid gap-8 rounded-[2.2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-6 shadow-[0_30px_105px_rgba(36,35,31,0.14)] md:p-10 lg:grid-cols-[0.56fr_0.44fr] lg:items-center">
          <div>
            <p className="section-label">Design partners</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">Building with teams deploying agents into high-stakes workflows.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">Operant is opening design-partner conversations with teams using AI agents across support, sales, customer success, and operations.</p>
            <div className="mt-8 flex flex-wrap gap-3"><CalendlyButton label="Apply for design partner access" variant="accent" size="lg" /><CalendlyButton label="Book a demo" variant="secondary" size="lg" /></div>
          </div>
          <div className="rounded-[1.7rem] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {programs.map(([team, value, Icon]) => (
                <div key={team} className="rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
                  <Icon className="h-5 w-5 text-[var(--color-primary-hover)]" />
                  <p className="mt-3 font-semibold">{team}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white/78 p-4">
              <p className="text-sm font-semibold">Program path</p>
              <div className="mt-4 grid gap-2">
                {timeline.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 text-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-dark)] text-xs font-bold text-white">{index + 1}</span><span>{item}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalProductCTA() {
  const rows = ["Policy match written", "Repair approved", "Export blocked until approval", "Manager approved", "Approved export logged"];
  const reduced = useReducedMotion();
  return (
    <section className="bg-[var(--color-background-panel)] py-24">
      <div className="mx-auto grid max-w-[1560px] gap-8 px-5 lg:grid-cols-[0.58fr_0.42fr] lg:items-center lg:px-10 xl:px-12">
        <div>
          <p className="section-label">Operate safely</p>
          <h2 className="mt-4 text-5xl font-semibold tracking-[-0.065em] md:text-7xl xl:text-8xl">Give your AI agents an operating layer.</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]">See how Operant checks agent output against policy, routes risk to review, repairs weak drafts, blocks unsafe export, and logs every decision.</p>
          <div className="mt-8 flex flex-wrap gap-3"><CalendlyButton variant="accent" size="lg" /><Button asChild variant="secondary" size="lg"><Link href="/product">Explore product <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>
        </div>
        <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-dark)] p-6 text-white shadow-[0_24px_90px_rgba(31,30,26,0.2)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-4"><p className="font-semibold">Final audit state</p><ClipboardCheck className="h-5 w-5 text-[var(--color-primary-soft)]" /></div>
          <div className="mt-4 space-y-3">
            {rows.map((row, index) => (
              <motion.div key={row} initial={reduced ? false : { opacity: 0, y: 10 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.12 }} className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/78">{row}</motion.div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-[color:var(--color-success)]/14 p-4 text-sm font-semibold text-green-100">Approved export logged</div>
        </div>
      </div>
    </section>
  );
}
