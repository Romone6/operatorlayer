import { Card } from "@/components/ui/card";

export function MetricCard({ label, value }: { label: string; value: number | string }) {
  return <Card className="p-4"><p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></Card>;
}

