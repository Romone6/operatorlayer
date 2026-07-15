"use client";

import { useState } from "react";

export function PolicyReviewActions(props: { policyId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "approve" | "reject" | "mark_outdated") {
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/review-queue/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType: "policy",
          itemId: props.policyId,
          action,
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Failed to update policy");
      setMessage("Updated");
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button className="rounded-lg border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300" onClick={() => run("approve")} type="button">
          Approve
        </button>
        <button className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300" onClick={() => run("reject")} type="button">
          Reject
        </button>
        <button className="rounded-lg border border-amber-500/30 px-2 py-1 text-xs text-amber-300" onClick={() => run("mark_outdated")} type="button">
          Mark outdated
        </button>
      </div>
      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
