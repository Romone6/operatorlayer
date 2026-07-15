import { Card } from "@/components/ui/card";

export function EmptyState({ message }: { message: string }) {
  return <Card className="p-10 text-center text-[var(--color-text-soft)]">{message}</Card>;
}

