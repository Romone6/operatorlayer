import { Card } from "@/components/ui/card";

export function LoadingState({ label = "Loading..." }: { label?: string }) { return <Card className="p-10 text-center text-[var(--color-text-soft)]">{label}</Card>; }

