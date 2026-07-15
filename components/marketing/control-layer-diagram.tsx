"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Ban, CheckCircle2, Database, FileText, Scale, ShieldCheck } from "lucide-react";

const sources = ["Policies", "Docs", "Playbooks", "Tickets", "CRM notes", "Brand rules", "Legal rules"];
const outputs = ["Support agents", "Sales copilots", "Internal workflows", "Approved exports", "CRM/support tools"];
const controls = [
  "Policy match + source evidence",
  "Risk, tone, context, compliance scoring",
  "Human review gates",
  "Export decisions",
  "Audit history",
];

export function ControlLayerDiagram() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[#eee9dd] py-20">
      <div className="absolute inset-0 operant-grid-bg opacity-45" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:items-center">
          <div>
            <p className="section-label">Control-layer position</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">Between agent output and business risk.</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">Operant is not another dashboard beside your agents. It is the policy, review, evaluation, and audit layer between company knowledge and the work agents try to export.</p>
          </div>

          <div className="rounded-[2.2rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4 shadow-[0_28px_100px_rgba(36,35,31,0.12)] md:p-7">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
              {sources.map((source, index) => (
                <motion.div key={source} initial={reduced ? false : { opacity: 0, y: -10 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-center text-sm font-semibold text-[var(--color-text-muted)]">
                  {source}
                </motion.div>
              ))}
            </div>

            <div className="relative my-6 flex items-center justify-center">
              <motion.div aria-hidden="true" className="absolute left-8 right-8 top-1/2 h-px bg-[var(--color-border)]" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
              <motion.div aria-hidden="true" animate={reduced ? undefined : { y: [0, 7, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="relative z-10 rounded-full border border-[var(--color-border)] bg-[var(--color-background-panel)] p-2 text-[var(--color-primary)]">
                <ArrowDown className="h-5 w-5" />
              </motion.div>
            </div>

            <motion.div initial={reduced ? false : { opacity: 0.9, scale: 0.98 }} whileInView={reduced ? undefined : { opacity: 1, scale: 1 }} viewport={{ once: true }} className="rounded-[1.8rem] border border-white/12 bg-[var(--color-dark)] p-6 text-white shadow-[0_24px_80px_rgba(31,30,26,0.22)] xl:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-primary-soft)]">Operant control layer</p>
                  <h3 className="mt-1 text-4xl font-semibold tracking-[-0.055em] xl:text-5xl">Check, repair, approve, block, log.</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-md bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/72"><ShieldCheck className="h-4 w-4" /> Export gate active</span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {controls.map((control, index) => (
                  <motion.div key={control} initial={reduced ? false : { opacity: 0, x: -10 }} whileInView={reduced ? undefined : { opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.18 + index * 0.06 }} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/7 px-4 py-3 text-sm text-white/82">
                    {[FileText, Scale, ShieldCheck, Ban, Database][index] ? (() => { const Icon = [FileText, Scale, ShieldCheck, Ban, Database][index]; return <Icon className="h-4 w-4 text-[var(--color-primary-soft)]" />; })() : null}
                    {control}
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--color-danger)]/35 bg-[color:var(--color-danger)]/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-100"><Ban className="h-4 w-4" /> Blocked output stops here</p>
                  <p className="mt-1 text-xs text-white/54">Legal interpretation + missing order ID</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--color-success)]/35 bg-[color:var(--color-success)]/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-green-100"><CheckCircle2 className="h-4 w-4" /> Approved export leaves with evidence</p>
                  <p className="mt-1 text-xs text-white/54">Repair, approval, source, and audit record attached</p>
                </div>
              </div>
            </motion.div>

            <div className="relative my-6 flex items-center justify-center">
              <motion.div aria-hidden="true" className="absolute left-8 right-8 top-1/2 h-px bg-[var(--color-border)]" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2 }} />
              <motion.div aria-hidden="true" animate={reduced ? undefined : { x: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="relative z-10 rounded-full border border-[var(--color-border)] bg-[var(--color-background-panel)] p-2 text-[var(--color-success)]">
                <ArrowRight className="h-5 w-5" />
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              {outputs.map((output, index) => (
                <motion.div key={output} initial={reduced ? false : { opacity: 0, y: 10 }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + index * 0.04 }} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-center text-sm font-semibold text-[var(--color-text-muted)]">
                  {output}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
