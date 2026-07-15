import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function EvaluationScoreCard({ score }: { score: number }) {
  return <Card className="p-5"><p className="text-sm text-[var(--color-text-soft)]">Evaluation score</p><p className="text-4xl font-semibold">{score}</p><Progress className="mt-3" value={score} /></Card>;
}

