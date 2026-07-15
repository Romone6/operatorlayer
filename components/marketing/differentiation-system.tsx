import {
  BookOpenCheck,
  FileCheck2,
  ReceiptText,
  SearchCheck,
  UserCheck,
} from "lucide-react";

const items = [
  {
    title: "Policy-backed outputs",
    body: "Drafts are evaluated against organisation policies, scenarios, phrases, and source evidence.",
    icon: BookOpenCheck,
  },
  {
    title: "Review-before-send",
    body: "High-risk responses are routed to human review instead of being sent automatically.",
    icon: UserCheck,
  },
  {
    title: "Evaluation scoring",
    body: "Responses are scored for policy fit, scenario flow, terminology, forbidden phrases, tone, and next step clarity.",
    icon: SearchCheck,
  },
  {
    title: "Exportable packs",
    body: "Reviewed rules become checksummed artifacts that connected agents can consume.",
    icon: FileCheck2,
  },
  {
    title: "Audit history",
    body: "Runtime decisions, reviews, repairs, and exports are logged with evidence pointers.",
    icon: ReceiptText,
  },
];

export function DifferentiationSystem() {
  return (
    <section className="border-b border-[var(--color-border)] bg-white py-24">
      <div className="mx-auto max-w-[1560px] px-5 lg:px-10 xl:px-12">
        <div className="max-w-4xl">
          <p className="section-label text-[var(--color-primary)]">Operating layer</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] text-[var(--color-text-main)] md:text-6xl">
            The product is built around governed communication, not generic automation.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-5"
              >
                <Icon className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold text-[var(--color-text-main)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
