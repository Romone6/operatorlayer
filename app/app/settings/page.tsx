"use client";

import { useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ConnectorCatalogItem } from "@/types/connector";
import type { Member, MemberInvite, AppRole } from "@/types/member";
import type { SettingsPayload } from "@/types/settings";
import type { AgentGovernanceConfig, RuntimeGovernanceMode } from "@/types/agent-config";

const roleOptions: AppRole[] = ["owner", "admin", "reviewer", "analyst", "member"];
const governanceModes: RuntimeGovernanceMode[] = [
  "suggest_only",
  "human_approval_required",
  "conditional_approval",
  "final_authority",
  "notify_only",
];

export default function SettingsPage() {
  const settings = useApi<SettingsPayload>("/api/settings", []);
  const connectorCatalog = useApi<ConnectorCatalogItem[]>("/api/connectors/catalog", []);
  const members = useApi<Member[]>("/api/members", []);
  const invites = useApi<MemberInvite[]>("/api/members/invites", []);
  const agentConfigs = useApi<AgentGovernanceConfig[]>("/api/agent-configs", []);

  const [saving, setSaving] = useState(false);
  const [savingAgentConfig, setSavingAgentConfig] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("member");
  const [inviting, setInviting] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

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
      const payload = {
        organisation: {
          name: String(formData.get("name") ?? "").trim(),
          industry: String(formData.get("industry") ?? "").trim() || null,
          riskTolerance: String(formData.get("riskTolerance") ?? "medium"),
          autoSendAllowed: String(formData.get("autoSendAllowed") ?? "off") === "on",
        },
        controls: {
          defaultTone: String(formData.get("defaultTone") ?? "consultative"),
          pricingApprovalThreshold: Number(formData.get("pricingApprovalThreshold") ?? 10),
          refundApprovalThreshold: Number(formData.get("refundApprovalThreshold") ?? 500),
          dataRetentionDays: Number(formData.get("dataRetentionDays") ?? 365),
          modelProvider: String(formData.get("modelProvider") ?? "openai"),
        },
      };

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Failed to update settings");
      }
      await settings.refresh();
      setMessage("Settings updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveAgentConfig(formData: FormData) {
    setSavingAgentConfig(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        agentId: String(formData.get("agentId") ?? "").trim(),
        displayName: String(formData.get("displayName") ?? "").trim(),
        channel: String(formData.get("channel") ?? "").trim(),
        useCase: String(formData.get("useCase") ?? "").trim(),
        customerSegment: String(formData.get("customerSegment") ?? "standard").trim(),
        governanceMode: String(formData.get("governanceMode") ?? "human_approval_required"),
        scoreThreshold: Number(formData.get("scoreThreshold") ?? 90),
        riskLevels: String(formData.get("riskLevels") ?? "low")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        notificationDestinations: String(formData.get("notificationDestinations") ?? "dashboard")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        enabled: String(formData.get("enabled") ?? "off") === "on",
      };
      const response = await fetch("/api/agent-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Failed to save agent config");
      }
      await agentConfigs.refresh();
      setMessage("Agent governance config saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save agent config");
    } finally {
      setSavingAgentConfig(false);
    }
  }

  async function updateMemberRole(memberId: string, role: AppRole) {
    setUpdatingMemberId(memberId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to update member role");
      }
      await members.refresh();
      setMessage("Member role updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update member role");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/members/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { acceptUrl?: string; emailDispatch?: { status: string; message?: string } };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to create invite");
      }
      await invites.refresh();
      setInviteEmail("");
      const status = payload.data?.emailDispatch?.status ?? "unknown";
      setMessage(`Invite created. Email delivery status: ${status}.`);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Failed to create invite");
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    setRevokingInviteId(inviteId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/members/invites/${inviteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to revoke invite");
      }
      await invites.refresh();
      setMessage("Invite revoked.");
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Failed to revoke invite");
    } finally {
      setRevokingInviteId(null);
    }
  }

  async function resendInvite(inviteId: string) {
    setResendingInviteId(inviteId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/members/invites/${inviteId}/resend`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { emailDispatch?: { status: string } };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to resend invite");
      }
      const status = payload.data?.emailDispatch?.status ?? "unknown";
      setMessage(`Invite resent. Email delivery status: ${status}.`);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Failed to resend invite");
    } finally {
      setResendingInviteId(null);
    }
  }

  async function copyInviteLink(acceptUrl: string | undefined) {
    if (!acceptUrl) {
      setError("Invite link unavailable for this record.");
      return;
    }
    try {
      await navigator.clipboard.writeText(acceptUrl);
      setMessage("Invite link copied.");
      setError(null);
    } catch {
      setError("Failed to copy invite link.");
    }
  }

  function openMailClient(mailtoUrl: string | undefined) {
    if (!mailtoUrl) {
      setError("Mail draft link unavailable for this invite.");
      return;
    }
    window.open(mailtoUrl, "_self", "noopener,noreferrer");
  }

  const controls = settings.data.controls;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <Card className="p-6">
        <form
          className="grid gap-4 md:grid-cols-2"
          action={(formData) => {
            void update(formData);
          }}
        >
          <label className="space-y-1 text-sm">
            <span>Name</span>
            <input
              name="name"
              defaultValue={settings.data.organisation.name}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Industry</span>
            <input
              name="industry"
              defaultValue={settings.data.organisation.industry ?? ""}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Risk tolerance</span>
            <select
              name="riskTolerance"
              defaultValue={settings.data.organisation.riskTolerance}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Model provider</span>
            <input
              name="modelProvider"
              defaultValue={controls?.modelProvider ?? "openai"}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Default tone</span>
            <input
              name="defaultTone"
              defaultValue={controls?.defaultTone ?? "consultative"}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Pricing approval threshold (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              name="pricingApprovalThreshold"
              defaultValue={controls?.pricingApprovalThreshold ?? 10}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Refund approval threshold</span>
            <input
              type="number"
              min={0}
              name="refundApprovalThreshold"
              defaultValue={controls?.refundApprovalThreshold ?? 500}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Data retention days</span>
            <input
              type="number"
              min={1}
              max={3650}
              name="dataRetentionDays"
              defaultValue={controls?.dataRetentionDays ?? 365}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="autoSendAllowed"
              defaultChecked={settings.data.organisation.autoSendAllowed}
            />
            <span>Auto-send allowed (must remain off for MVP)</span>
          </label>
          <div className="md:col-span-2">
            <Button disabled={saving} type="submit">
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Agent governance</h2>
        <form
          className="grid gap-3 md:grid-cols-2"
          action={(formData) => {
            void saveAgentConfig(formData);
          }}
        >
          <label className="space-y-1 text-sm">
            <span>Agent ID</span>
            <input
              name="agentId"
              defaultValue="support-agent"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Display name</span>
            <input
              name="displayName"
              defaultValue="Support agent"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Channel</span>
            <input
              name="channel"
              defaultValue="email"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Use case</span>
            <input
              name="useCase"
              defaultValue="support_reply"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Customer segment</span>
            <input
              name="customerSegment"
              defaultValue="standard"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Governance mode</span>
            <select
              name="governanceMode"
              defaultValue="human_approval_required"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            >
              {governanceModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Score threshold</span>
            <input
              type="number"
              min={0}
              max={100}
              name="scoreThreshold"
              defaultValue={90}
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Allowed risk levels</span>
            <input
              name="riskLevels"
              defaultValue="low"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Notification destinations</span>
            <input
              name="notificationDestinations"
              defaultValue="dashboard"
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked />
            <span>Enabled</span>
          </label>
          <div className="md:col-span-2">
            <Button disabled={savingAgentConfig} type="submit">
              {savingAgentConfig ? "Saving..." : "Save agent config"}
            </Button>
          </div>
        </form>
        {agentConfigs.loading ? (
          <LoadingState label="Loading agent configs..." />
        ) : agentConfigs.error ? (
          <p className="text-sm text-[var(--color-text-soft)]">
            Agent governance unavailable: {agentConfigs.error}
          </p>
        ) : !agentConfigs.data?.length ? (
          <EmptyState message="No agent governance configs yet." />
        ) : (
          <div className="space-y-3">
            {agentConfigs.data.map((config) => (
              <div
                key={config.id}
                className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{config.displayName}</p>
                  <span className="rounded-full border border-[var(--color-border-soft)] px-2 py-1 text-xs">
                    {config.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  {config.agentId} · {config.channel} · {config.useCase} · {config.customerSegment}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  Mode {config.governanceMode} · Threshold {config.scoreThreshold} · Risks {config.riskLevels.join(", ")}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  Notifications {config.notificationDestinations.join(", ") || "none"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Connector availability</h2>
        {connectorCatalog.loading ? (
          <LoadingState label="Loading connector availability..." />
        ) : connectorCatalog.error ? (
          <p className="text-sm text-[var(--color-text-soft)]">
            Connector availability unavailable: {connectorCatalog.error}
          </p>
        ) : !connectorCatalog.data?.length ? (
          <EmptyState message="No connector catalog data available." />
        ) : (
          <div className="space-y-3">
            {connectorCatalog.data.map((item) => (
              <div
                key={item.provider}
                className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize">{item.provider}</p>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${
                      item.state === "available"
                        ? "border-emerald-400/50 text-emerald-300"
                        : "border-amber-400/50 text-amber-200"
                    }`}
                  >
                    {item.state === "available" ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-soft)]">{item.message}</p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  Connected: {item.connected ? "yes" : "no"} · Feature flag: {item.featureEnabled ? "enabled" : "disabled"}
                </p>
                {item.missingEnv.length > 0 ? (
                  <p className="mt-1 text-xs text-amber-200">
                    Missing env: {item.missingEnv.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Member invites</h2>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={(event) => void createInvite(event)}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="teammate@company.com"
            className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
            required
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as AppRole)}
            className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={inviting}>
            {inviting ? "Inviting..." : "Send invite"}
          </Button>
        </form>

        {invites.loading ? (
          <LoadingState label="Loading invites..." />
        ) : invites.error ? (
          <p className="text-sm text-[var(--color-text-soft)]">Invites unavailable: {invites.error}</p>
        ) : !invites.data?.length ? (
          <EmptyState message="No invites yet. Invite collaborators to join this workspace." />
        ) : (
          <div className="space-y-3">
            {invites.data.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-[var(--color-text-soft)]">
                    Role {invite.role} · Status {invite.status}
                  </p>
                  <p className="text-xs text-[var(--color-text-soft)]">
                    Delivery {invite.deliveryState ?? "not_requested"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-[var(--color-border-soft)]"
                    onClick={() => {
                      openMailClient(invite.mailtoUrl);
                    }}
                  >
                    Open mail app
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-[var(--color-border-soft)]"
                    disabled={invite.status !== "pending" || resendingInviteId === invite.id}
                    onClick={() => {
                      void resendInvite(invite.id);
                    }}
                  >
                    {resendingInviteId === invite.id ? "Resending..." : "Resend"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-[var(--color-border-soft)]"
                    onClick={() => {
                      void copyInviteLink(invite.acceptUrl);
                    }}
                  >
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="border-[var(--color-border-soft)]"
                    disabled={invite.status !== "pending" || revokingInviteId === invite.id}
                    onClick={() => {
                      void revokeInvite(invite.id);
                    }}
                  >
                    {revokingInviteId === invite.id ? "Revoking..." : "Revoke"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Members and roles</h2>
        {members.loading ? (
          <LoadingState label="Loading members..." />
        ) : members.error ? (
          <p className="text-sm text-[var(--color-text-soft)]">Member management unavailable: {members.error}</p>
        ) : !members.data?.length ? (
          <EmptyState message="No members found for this workspace." />
        ) : (
          <div className="space-y-3">
            {members.data.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] p-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{member.name ?? member.email}</p>
                  <p className="text-xs text-[var(--color-text-soft)]">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-card)] px-3 py-2 text-sm"
                    onChange={(event) => {
                      void updateMemberRole(member.id, event.target.value as AppRole);
                    }}
                    disabled={updatingMemberId === member.id}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}

