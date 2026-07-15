"use client";

import { useState } from "react";

export function SourceActions(props: { sourceId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invoke(path: string, method: "POST" | "DELETE") {
    setStatus(null);
    setError(null);
    try {
      const response = await fetch(path, {
        method,
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Action failed");
      setStatus("Action completed.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-[var(--color-border-soft)] px-2 py-1 text-xs"
          onClick={() => invoke(`/api/sources/${props.sourceId}/reprocess`, "POST")}
          type="button"
        >
          Reprocess
        </button>
        <button
          className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-300"
          onClick={() => invoke(`/api/sources/${props.sourceId}`, "DELETE")}
          type="button"
        >
          Delete
        </button>
      </div>
      {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
