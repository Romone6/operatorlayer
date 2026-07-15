"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ApiCredential = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: string;
  createdAt: string;
};

type McpCapabilities = {
  capabilities: Array<{ id: string; title: string; description: string }>;
  capabilityStates: Array<{ id: string; title: string; state: string; reason: string }>;
};

type LlmProvider = {
  id: string;
  provider: string;
  displayName: string;
  model: string;
  keyPreview: string;
  status: string;
  active: boolean;
};

type LlmProviderPayload = {
  providers: LlmProvider[];
};

export default function DeveloperPage() {
  const apiKeys = useApi<ApiCredential[]>("/api/api-keys", []);
  const llmProviders = useApi<LlmProviderPayload>("/api/llm/providers", []);
  const mcp = useApi<McpCapabilities>("/api/mcp/capabilities", []);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loading = apiKeys.loading || llmProviders.loading || mcp.loading;
  const loadError = apiKeys.error ?? llmProviders.error ?? mcp.error;
  if (loading) return <LoadingState label="Loading developer setup..." />;
  if (loadError) return <ErrorState message={loadError} />;

  async function createRuntimeKey() {
    setSaving(true);
    setRawKey(null);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Runtime governance key", scopes: ["runtime.invoke"] }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { rawKey: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to create API key");
      }
      setRawKey(payload.data.rawKey);
      await apiKeys.refresh();
      setMessage("Runtime API key created. Store the raw key now; it will not be shown again.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create API key");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Developer setup</h1>
        <p className="mt-2 text-sm text-[var(--color-text-soft)]">
          API keys, MCP capability status, and BYOK routing state are loaded from workspace records.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">API keys</h2>
          <Button onClick={createRuntimeKey} disabled={saving}>
            {saving ? "Creating..." : "Create runtime key"}
          </Button>
        </div>
        {rawKey ? (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/20 p-3 text-sm text-emerald-100">
            <p className="font-medium">Raw key</p>
            <code className="mt-2 block break-all text-xs">{rawKey}</code>
          </div>
        ) : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {!apiKeys.data?.length ? (
          <EmptyState message="No API keys exist yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {apiKeys.data.map((key) => (
              <div key={key.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <p className="text-sm font-medium">{key.name}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">{key.keyPrefix}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {key.scopes.join(", ")} | {key.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-xl font-semibold">MCP capabilities</h2>
        {!mcp.data?.capabilityStates.length ? (
          <EmptyState message="No MCP capabilities available." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mcp.data.capabilityStates.map((capability) => (
              <div key={capability.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{capability.title}</p>
                  <span className={capability.state === "available" ? "text-xs text-emerald-300" : "text-xs text-amber-200"}>
                    {capability.state === "available" ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">{capability.reason}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-xl font-semibold">BYOK model routing</h2>
        {!llmProviders.data?.providers.length ? (
          <EmptyState message="No BYOK provider keys configured." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {llmProviders.data.providers.map((provider) => (
              <div key={provider.id} className="rounded-lg border border-[var(--color-border-soft)] p-3">
                <p className="text-sm font-medium">{provider.displayName}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {provider.provider} | {provider.model} | {provider.keyPreview}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {provider.active ? "Active route" : "Inactive"} | {provider.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
