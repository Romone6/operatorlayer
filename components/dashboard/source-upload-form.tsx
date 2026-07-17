"use client";

import { useState } from "react";

type FormState = {
  title: string;
  sourceType: "pdf" | "docx" | "markdown" | "txt" | "csv" | "json" | "pasted_text";
  authorityLevel: string;
  pastedText: string;
};

const initialState: FormState = {
  title: "",
  sourceType: "txt",
  authorityLevel: "standard",
  pastedText: "",
};

export function SourceUploadForm({ onCreated }: { onCreated?: () => Promise<void> | void }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const body = new FormData();
      body.set("title", form.title);
      body.set("sourceType", form.sourceType);
      body.set("authorityLevel", form.authorityLevel);
      body.set("pastedText", form.pastedText);
      if (file) body.set("file", file);

      const response = await fetch("/api/sources/upload", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Upload failed");
      }

      await onCreated?.();
      setMessage("Source added. Extraction has started.");
      setForm(initialState);
      setFile(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-4">
      <div>
        <h3 className="font-semibold">Add a source</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Operant starts extracting guidance as soon as you add it.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-[var(--color-text-muted)]">Title</span>
          <input
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--color-text-muted)]">Source Type</span>
          <select
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
            value={form.sourceType}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sourceType: event.target.value as FormState["sourceType"] }))
            }
          >
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="markdown">Markdown</option>
            <option value="txt">TXT</option>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="pasted_text">Pasted Text</option>
          </select>
        </label>
      </div>
      {form.sourceType === "pasted_text" ? (
        <label className="space-y-1 text-sm">
          <span className="text-[var(--color-text-muted)]">Pasted Text</span>
          <textarea
            aria-label="Pasted Text Content"
            className="h-40 w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
            value={form.pastedText}
            onChange={(event) => setForm((prev) => ({ ...prev, pastedText: event.target.value }))}
            required
          />
        </label>
      ) : (
        <label className="space-y-1 text-sm">
          <span className="text-[var(--color-text-muted)]">File</span>
          <input
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Adding source..." : "Add source and start extraction"}
      </button>
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
