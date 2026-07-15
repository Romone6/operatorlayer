import { FileCheck2, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";

import {
  ProductBrowserFrame,
  ProductDataTable,
  ProductShell,
  ProductStatus,
} from "@/components/marketing/product-demo-primitives";

const artifacts = [
  ["company_voice.md", "Voice guidance", "checksumed"],
  ["communication_policy.json", "Approved rules", "source-linked"],
  ["scenario_playbooks.json", "Runtime flows", "versioned"],
  ["agent_prompt_pack.md", "Agent instructions", "reviewed"],
];

const controls = [
  { label: "Human reviewed", icon: ShieldCheck },
  { label: "Source evidence", icon: FileCheck2 },
  { label: "Rollback ready", icon: RotateCcw },
  { label: "No hidden training", icon: LockKeyhole },
];

export function GovernedExportMachine() {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background)] py-24">
      <div className="mx-auto grid max-w-[1560px] gap-10 px-5 lg:grid-cols-[0.36fr_0.64fr] lg:items-center lg:px-10 xl:px-12">
        <div>
          <p className="section-label text-[var(--color-primary)]">Governed exports</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-[var(--color-text-main)] md:text-6xl">
            Agent packs should be evidence, not loose prompts.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[var(--color-text-muted)]">
            OperatorLayer packages approved policy, scenario, phrase, rubric, and prompt artifacts with checksums, review state, and source traceability before agents consume them.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {controls.map((control) => {
              const Icon = control.icon;
              return (
                <div
                  key={control.label}
                  className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white/72 p-3 text-sm font-semibold text-[var(--color-text-main)]"
                >
                  <Icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  {control.label}
                </div>
              );
            })}
          </div>
        </div>
        <ProductBrowserFrame
          title="OperatorLayer"
          route="exports / policy-pack"
          status="Review gate active"
        >
          <ProductShell className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-main)]">
                  Policy pack export
                </p>
                <p className="text-xs text-[var(--color-text-soft)]">
                  Versioned artifact set generated from reviewed organisation records
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ProductStatus label="Signed" tone="success" />
                <ProductStatus label="Auto-send disabled" tone="danger" />
              </div>
            </div>
            <ProductDataTable
              columns={["Artifact", "Purpose", "Control"]}
              rows={artifacts}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--color-border)] bg-white/76 p-4">
                <p className="text-xs text-[var(--color-text-soft)]">Manifest</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">
                  checksum + signature
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-white/76 p-4">
                <p className="text-xs text-[var(--color-text-soft)]">Rollback</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">
                  prior pack pointer
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-white/76 p-4">
                <p className="text-xs text-[var(--color-text-soft)]">Runtime</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">
                  policy-pack reference
                </p>
              </div>
            </div>
          </ProductShell>
        </ProductBrowserFrame>
      </div>
    </section>
  );
}
