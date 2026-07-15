"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type NotificationDestination = {
  destination: string;
  state: string;
  reason: string;
  activeSubscriptions?: number;
};

type WebhookSubscription = {
  id: string;
  endpoint: string;
  events: string[];
  status: string;
  secretPreview: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const destinations = useApi<NotificationDestination[]>("/api/notifications/destinations", []);
  const webhooks = useApi<WebhookSubscription[]>("/api/webhooks", []);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = destinations.loading || webhooks.loading;
  const loadError = destinations.error ?? webhooks.error;
  if (loading) return <LoadingState label="Loading notification routing..." />;
  if (loadError) return <ErrorState message={loadError} />;

  async function createWebhook(formData: FormData) {
    setSaving(true);
    setSecret(null);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: String(formData.get("endpoint") ?? "").trim(),
          events: String(formData.get("events") ?? "runtime_governance.*")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { secret: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Failed to create webhook");
      setSecret(payload.data.secret);
      await Promise.all([webhooks.refresh(), destinations.refresh()]);
      setMessage("Webhook destination created. Store the signing secret now.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create webhook");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Notifications</h1>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          Runtime notifications use real webhook delivery when configured. Other providers stay unavailable until implemented.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="text-xl font-semibold">Destination status</h2>
        {!destinations.data?.length ? (
          <EmptyState message="No destination status available." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {destinations.data.map((destination) => (
              <div key={destination.destination} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">{destination.destination}</p>
                  <span className={destination.state === "available" ? "text-xs text-emerald-300" : "text-xs text-amber-200"}>
                    {destination.state}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">{destination.reason}</p>
                {typeof destination.activeSubscriptions === "number" ? (
                  <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                    Active subscriptions: {destination.activeSubscriptions}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-xl font-semibold">Webhook destination</h2>
        <form className="grid gap-3 md:grid-cols-[1fr_260px_auto]" action={(formData) => void createWebhook(formData)}>
          <input
            name="endpoint"
            type="url"
            placeholder="https://example.com/operatorlayer/webhook"
            className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            required
          />
          <input
            name="events"
            defaultValue="runtime_governance.*"
            className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
          />
          <Button disabled={saving} type="submit">
            {saving ? "Creating..." : "Create webhook"}
          </Button>
        </form>
        {secret ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/20 p-3 text-sm text-emerald-100">
            <p className="font-medium">Signing secret</p>
            <code className="mt-2 block break-all text-xs">{secret}</code>
          </div>
        ) : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {!webhooks.data?.length ? (
          <EmptyState message="No webhook destinations configured." />
        ) : (
          <div className="space-y-3">
            {webhooks.data.map((webhook) => (
              <div key={webhook.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <p className="break-all text-sm font-medium">{webhook.endpoint}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {webhook.events.join(", ")} | {webhook.status} | {webhook.secretPreview}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
