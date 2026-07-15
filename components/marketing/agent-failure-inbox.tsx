"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { problemItems } from "@/components/marketing/operant-data";
import { ProductDataTable, ProductStatus } from "@/components/marketing/product-demo-primitives";
import { cn } from "@/lib/utils";

export function AgentFailureInbox() {
  const [active, setActive] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const selected = problemItems[active];
  const Icon = selected.icon;

  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(() => setActive((value) => (value + 1) % problemItems.length), 3400);
    return () => window.clearInterval(id);
  }, [paused, reduced]);

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background)] py-24">
      <div className="mx-auto grid max-w-[1560px] gap-10 px-5 lg:grid-cols-[0.39fr_0.61fr] lg:px-10 xl:px-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="section-label">Before Operant</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">{"AI agents are powerful. But they don't know your rules."}</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">This is what breaks when agents draft customer-facing work without company policy, context, approvals, and auditability.</p>
          <AnimatePresence mode="wait">
            <motion.div key={selected.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-8 rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-5 shadow-[0_18px_60px_rgba(36,35,31,0.08)]">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]"><Icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Active failure</p>
                  <h3 className="text-xl font-semibold tracking-[-0.035em]">{selected.title}</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <p><span className="font-semibold">Example:</span> <span className="text-[var(--color-text-muted)]">{selected.example}</span></p>
                <p><span className="font-semibold">Business risk:</span> <span className="text-[var(--color-text-muted)]">{selected.risk}</span></p>
                <p><span className="font-semibold">Operant fix:</span> <span className="text-[var(--color-text-muted)]">{selected.fix}</span></p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-3 shadow-[0_24px_80px_rgba(36,35,31,0.1)] md:p-6">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-2 pb-4">
            <div>
              <p className="text-sm font-semibold">Agent failure inbox</p>
              <p className="text-xs text-[var(--color-text-soft)]">Unresolved outputs waiting for policy, context, review, and evidence.</p>
            </div>
            <ProductStatus label="6 open risks" tone="danger" />
          </div>
          <div className="mt-4 hidden xl:block">
            <ProductDataTable
              columns={["Issue", "Example", "Business risk", "Operant fix"]}
              rows={problemItems.map((item, index) => [
                <button key={`${item.title}-issue`} type="button" onClick={() => { setActive(index); setPaused(true); }} className={cn("text-left font-semibold", index === active ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-main)]")}>{item.title}</button>,
                item.example,
                item.risk,
                item.fix,
              ])}
            />
          </div>
          <div className="mt-4 grid gap-3 xl:hidden">
            {problemItems.map((item, index) => {
              const RowIcon = item.icon;
              const isActive = index === active;
              return (
                <button key={item.title} type="button" onClick={() => { setActive(index); setPaused(true); }} className={cn("group grid w-full gap-3 rounded-2xl border p-4 text-left transition md:grid-cols-[46px_1fr_0.72fr_0.9fr] md:items-center xl:p-5", isActive ? "scale-[1.01] border-[var(--color-primary)] bg-[color:var(--color-primary)]/8 shadow-[0_18px_54px_rgba(201,111,58,0.16)]" : "border-[var(--color-border)] bg-white/72 hover:border-[var(--color-border-soft)] hover:bg-white")}>
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isActive ? "bg-[var(--color-dark)] text-white" : "bg-[var(--color-background-soft)] text-[var(--color-text-muted)]")}><RowIcon className="h-5 w-5" /></span>
                  <span>
                    <span className="block text-base font-semibold tracking-[-0.03em]">{item.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-[var(--color-text-muted)]">{item.example}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-warning)] md:justify-self-start">{item.status}</span>
                  <span className="text-sm font-semibold text-[var(--color-primary-hover)]">{item.fix}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
