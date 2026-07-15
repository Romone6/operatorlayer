import { Card } from "@/components/ui/card";

export function TestimonialCard() {
  return <Card className="p-6"><p className="text-lg font-semibold">Customer stories coming soon.</p><p className="mt-3 text-sm text-[var(--color-text-muted)]">Approved quotes and metrics will be added only when supplied.</p></Card>;
}

export function DeveloperGuidanceCard() {
  return <Card className="p-6"><p className="section-label">Developer guidance</p><p className="mt-3 text-sm text-[var(--color-text-muted)]">Next.js, TypeScript, Tailwind v4, shadcn/ui, and policy-evidence primitives.</p></Card>;
}
