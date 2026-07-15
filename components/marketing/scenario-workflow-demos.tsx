"use client";

import { motion } from "framer-motion";
import { ArrowRight, ClipboardCheck, X } from "lucide-react";
import { useState } from "react";

import { scenarioItems } from "@/components/marketing/operant-data";
import { ProductDataTable, ProductStatus } from "@/components/marketing/product-demo-primitives";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const workflowSteps = ["Draft", "Match", "Score", "Review", "Repair", "Export", "Audit"];

function scoreRows(selected: (typeof scenarioItems)[number]) {
  return [
    ["Risk", selected.risk === "High" ? "88" : selected.risk === "Medium" ? "66" : "38", selected.detected, selected.risk === "High" ? "Block export" : "Reviewer check"],
    ["Policy fit", "92", selected.policy, "Keep evidence attached"],
    ["Context", selected.missing === "Order ID" ? "61" : "74", `Missing: ${selected.missing}`, "Request context"],
    ["Tone", selected.risk === "Low" ? "86" : "74", "Customer-safe wording needed", "Repair before export"],
  ];
}

export function ScenarioWorkflowDemos() {
  const [selected, setSelected] = useState<(typeof scenarioItems)[number] | null>(null);

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background-panel)] py-20" id="scenarios">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="section-label">Scenario workflow demos</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.055em] md:text-6xl xl:text-7xl">Open a workflow and follow the decision.</h2>
          </div>
          <p className="max-w-md text-lg leading-8 text-[var(--color-text-muted)]">Each scenario shows the incoming draft, matched policy, action outcome, reviewer decision path, final output, and audit trail.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {scenarioItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-5 shadow-[0_18px_65px_rgba(36,35,31,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(36,35,31,0.12)]">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[var(--color-dark)] text-white"><Icon className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-soft)]">{item.team}</p>
                      <h3 className="text-2xl font-semibold tracking-[-0.05em]">{item.title}</h3>
                    </div>
                  </div>
                  <ProductStatus label={item.risk === "High" ? "Blocked" : "Review"} tone={item.risk === "High" ? "danger" : "warning"} />
                </div>
                <div className="mt-5">
                  <ProductDataTable
                    columns={["Field", "Preview"]}
                    rows={[
                      ["Incoming draft", item.before],
                      ["Matched policy", item.policy],
                      ["Action outcome", item.action],
                    ]}
                  />
                </div>
                <Button type="button" variant="secondary" className="mt-5 w-full justify-between" onClick={() => setSelected(item)}>
                  View workflow <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Button>
              </article>
            );
          })}
        </div>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent
          style={{
            left: "auto",
            right: 0,
            top: 0,
            bottom: 0,
            transform: "none",
            width: "min(720px, 100vw)",
            maxWidth: "min(720px, 100vw)",
            height: "100vh",
            maxHeight: "100vh",
            background: "var(--color-background-panel)",
          }}
          className="!fixed !bottom-0 !left-auto !right-0 !top-0 !z-[60] !translate-x-0 !translate-y-0 !overflow-y-auto !rounded-none !border-l !border-[var(--color-border)] !bg-[var(--color-background-panel)] !p-0 !shadow-[0_30px_120px_rgba(36,35,31,0.24)]"
        >
          {selected ? (
            <div className="min-h-screen p-5 md:p-7">
              <SheetClose asChild>
                <button type="button" className="sticky top-0 z-10 ml-auto flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-background-panel)] shadow-sm" aria-label="Close scenario workflow">
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
              <SheetHeader className="-mt-10 pr-12">
                <div className="flex items-center gap-3">
                  <ProductStatus label={selected.team} tone="accent" />
                  <ProductStatus label={selected.final} tone={selected.risk === "High" ? "danger" : "success"} />
                </div>
                <SheetTitle className="mt-4 text-4xl tracking-[-0.055em]">{selected.title}</SheetTitle>
                <SheetDescription>{selected.problem}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-7">
                {workflowSteps.map((step, index) => (
                  <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2 text-center text-xs font-semibold text-[var(--color-text-muted)]">
                    {index + 1}. {step}
                  </motion.div>
                ))}
              </div>

              <div className="mt-7 grid gap-6">
                <section className="rounded-lg border border-[color:var(--color-danger)]/28 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-danger)]">Incoming draft</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{`"${selected.before}"`}</p>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">Trigger: {selected.trigger}</p>
                </section>

                <section>
                  <h3 className="mb-3 text-xl font-semibold tracking-[-0.04em]">Matched evidence</h3>
                  <ProductDataTable columns={["Policy", "Source", "Owner", "Condition"]} rows={[[selected.policy, "Approved source evidence", selected.team === "Sales" ? "Sales Ops" : selected.team === "Support" ? "Legal" : "Operations", selected.trigger]]} />
                </section>

                <section>
                  <h3 className="mb-3 text-xl font-semibold tracking-[-0.04em]">Evaluation</h3>
                  <ProductDataTable columns={["Signal", "Score", "Result", "Required action"]} rows={scoreRows(selected)} />
                </section>

                <section className="rounded-lg border border-[var(--color-border)] bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">Review action</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{selected.action}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button variant="secondary">Approve</Button>
                    <Button variant="accent">Repair</Button>
                    <Button variant="secondary">Reject</Button>
                  </div>
                </section>

                <section className="rounded-lg border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/8 p-5">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">Final output</h3>
                  <p className="mt-3 text-lg font-semibold">{selected.after}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{selected.recommendation}</p>
                </section>

                <section className="rounded-lg border border-white/10 bg-[var(--color-dark)] p-5 text-white">
                  <p className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4" /> Audit trail</p>
                  <div className="mt-4">
                    <ProductDataTable
                      dark
                      columns={["Event", "Record"]}
                      rows={[
                        ["Policy match", selected.policy],
                        ["Risk detected", selected.detected],
                        ["Review action", selected.action],
                        ["Final state", selected.audit],
                      ]}
                    />
                  </div>
                </section>
              </div>
              <SheetClose asChild>
                <Button variant="secondary" className="mt-6 w-full" aria-label="Close scenario workflow">Close scenario workflow</Button>
              </SheetClose>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
