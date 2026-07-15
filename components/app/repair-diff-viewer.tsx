import { Card } from "@/components/ui/card";

export function RepairDiffViewer({ before, after }: { before: string; after: string }) {
  return <Card className="grid gap-4 p-5 md:grid-cols-2"><div><p className="text-xs text-rose-300">Before</p><p className="text-sm text-[var(--color-text-soft)]">{before}</p></div><div><p className="text-xs text-emerald-300">After</p><p className="text-sm text-[var(--color-text-soft)]">{after}</p></div></Card>;
}

