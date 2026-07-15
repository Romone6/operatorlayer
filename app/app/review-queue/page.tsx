"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { ReviewQueueItem } from "@/components/app/review-queue-item";
import { useApi } from "@/components/app/use-api";
import { Card } from "@/components/ui/card";
import type { ReviewActionRequest, ReviewQueuePayload, ReviewQueueSection } from "@/types/review-queue";
import type { ReviewEvent } from "@/types/review-event";

export default function ReviewQueuePage() {
  const queue = useApi<ReviewQueuePayload>("/api/review-queue", []);
  const reviewEvents = useApi<ReviewEvent[]>("/api/review-events", []);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sections = useMemo(
    () => queue.data?.sections.filter((section) => section.items.length > 0) ?? [],
    [queue.data]
  );

  async function runAction(
    item: ReviewQueueSection["items"][number],
    action: ReviewActionRequest["action"]
  ) {
    setBusyItemId(item.id);
    setActionError(null);
    try {
      const payload: ReviewActionRequest = {
        itemType: item.entityType,
        itemId: item.id,
        action,
      };

      if (action === "edit") {
        const editedValue = window.prompt("Update review note", item.summary);
        if (editedValue === null) {
          return;
        }
        if (item.entityType === "policy") {
          payload.payload = { description: editedValue };
        } else if (item.entityType === "terminology") {
          payload.payload = { recommendation: editedValue };
        } else {
          payload.payload = { recommendedResolution: editedValue };
        }
      }

      if (action === "request_reprocessing" && item.sourceId) {
        payload.payload = { sourceId: item.sourceId };
      }

      const response = await fetch("/api/review-queue/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Action failed");
      }
      await queue.refresh();
      await reviewEvents.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyItemId(null);
    }
  }

  if (queue.loading) return <LoadingState label="Loading review queue..." />;
  if (queue.error) return <ErrorState message={queue.error} />;
  if (!queue.data || queue.data.summary.total === 0) {
    return <EmptyState message="Nothing needs review right now." />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Review Queue</h1>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          Suggested rules, low-confidence outputs, risky terminology, conflicts, and outdated behaviour.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Suggested rules" value={queue.data.summary.suggestedRules} />
        <SummaryCard label="Low confidence" value={queue.data.summary.lowConfidence} />
        <SummaryCard label="Risky terminology" value={queue.data.summary.riskyTerminology} />
        <SummaryCard label="Conflicts" value={queue.data.summary.conflicts} />
        <SummaryCard label="Outdated" value={queue.data.summary.outdatedBehaviour} />
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--color-text-main)]">{section.label}</h2>
          <div className="space-y-3">
            {section.items.map((item) => (
              <ReviewQueueItem
                key={`${section.id}-${item.id}`}
                item={item}
                busy={busyItemId === item.id}
                onAction={runAction}
              />
            ))}
          </div>
        </div>
      ))}

      <Card className="space-y-3 p-5">
        <h2 className="text-xl font-semibold">Review Audit Trail</h2>
        {reviewEvents.loading ? (
          <p className="text-sm text-[var(--color-text-soft)]">Loading review events...</p>
        ) : !reviewEvents.data?.length ? (
          <p className="text-sm text-[var(--color-text-soft)]">No review actions recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-[var(--color-text-soft)]">
            {reviewEvents.data.slice(0, 20).map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt).toLocaleString()} · {event.itemType} {event.itemId} · {event.action} by{" "}
                {event.actorId}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function SummaryCard(props: { label: string; value: number }) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{props.label}</p>
      <p className="text-3xl font-semibold">{props.value}</p>
    </Card>
  );
}
