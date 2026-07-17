"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SettingsPayload } from "@/types/settings";

export default function SettingsPage() {
  const settings = useApi<SettingsPayload>("/api/settings", []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (settings.loading) return <LoadingState label="Loading settings..." />;
  if (settings.error) return <ErrorState message={settings.error} />;
  if (!settings.data) return <EmptyState message="Settings are unavailable for this workspace." />;

  async function update(formData: FormData) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation: {
            name: String(formData.get("name") ?? "").trim(),
            industry: String(formData.get("industry") ?? "").trim() || null,
            riskTolerance: String(formData.get("riskTolerance") ?? "medium"),
            autoSendAllowed: false,
          },
          controls: {
            defaultTone: String(formData.get("defaultTone") ?? "consultative"),
            dataRetentionDays: Number(formData.get("dataRetentionDays") ?? 365),
            modelProvider: "openai",
          },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Failed to update settings");
      await settings.refresh();
      setMessage("Settings updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  const controls = settings.data.controls;
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          This upload-based core never sends messages or connects to external inboxes.
        </p>
      </div>
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-2" action={(formData) => void update(formData)}>
          <label className="space-y-1 text-sm">
            <span>Organisation name</span>
            <input name="name" defaultValue={settings.data.organisation.name} required className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Industry</span>
            <input name="industry" defaultValue={settings.data.organisation.industry ?? ""} className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Risk tolerance</span>
            <select name="riskTolerance" defaultValue={settings.data.organisation.riskTolerance} className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2">
              <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Default tone</span>
            <input name="defaultTone" defaultValue={controls?.defaultTone ?? "consultative"} className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Data retention days</span>
            <input type="number" min={1} max={3650} name="dataRetentionDays" defaultValue={controls?.dataRetentionDays ?? 365} className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2" />
          </label>
          <div className="rounded-xl border border-[var(--color-border-soft)] p-3 text-sm text-[var(--color-text-soft)]">
            Model calls use the server-managed <code>OPENAI_API_KEY</code>. Per-organisation provider keys are not part of this core.
          </div>
          <div className="md:col-span-2"><Button disabled={saving} type="submit">{saving ? "Saving..." : "Save settings"}</Button></div>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>
    </section>
  );
}
