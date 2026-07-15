import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";
import { RiskBadge } from "@/components/app/risk-badge";
import { ConfidenceBadge } from "@/components/app/confidence-badge";
import type { ReviewQueueItem as QueueItem } from "@/types/review-queue";

type Props = {
  item: QueueItem;
  busy?: boolean;
  onAction: (
    item: QueueItem,
    action: "approve" | "edit" | "reject" | "mark_outdated" | "request_reprocessing"
  ) => Promise<void> | void;
};

export function ReviewQueueItem({ item, busy, onAction }: Props) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <StatusBadge status={item.status} />
        {item.severity ? <RiskBadge risk={item.severity} /> : null}
        {typeof item.confidence === "number" ? <ConfidenceBadge confidence={item.confidence} /> : null}
      </div>

      <p className="text-sm text-[var(--color-text-soft)]">{item.summary}</p>

      <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
        <p>
          Reviewer: {item.reviewedBy ?? "Not reviewed"}{" "}
          {item.reviewedAt ? `(${new Date(item.reviewedAt).toLocaleString()})` : ""}
        </p>
        <p>Last updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Unknown"}</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)]/60 p-3 text-xs text-[var(--color-text-soft)]">
        <p className="mb-2 font-medium text-[var(--color-text-main)]">Evidence</p>
        <ul className="space-y-1">
          {item.evidence.map((entry) => (
            <li key={`${item.id}-${entry}`}>{entry}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => onAction(item, "approve")}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(item, "edit")}>
          Edit
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(item, "mark_outdated")}>
          Mark outdated
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(item, "request_reprocessing")}>
          Reprocess
        </Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => onAction(item, "reject")}>
          Reject
        </Button>
      </div>
    </Card>
  );
}
