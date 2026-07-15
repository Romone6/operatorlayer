import { Badge } from "@/components/ui/badge";

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const value = Math.round(confidence * 100);
  return <Badge variant={value >= 90 ? "success" : value >= 75 ? "warning" : "danger"}>{value}% confidence</Badge>;
}

