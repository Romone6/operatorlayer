"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type InvitePayload = {
  id: string;
  organisationId: string;
  email: string;
  role: "owner" | "admin" | "reviewer" | "analyst" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
};

export default function InvitePage() {
  const router = useRouter();
  const routeParams = useParams<{ token: string }>();
  const routeToken = typeof routeParams?.token === "string" ? routeParams.token : "";
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const signInHref = `/sign-in?next=${encodeURIComponent(`/invite/${routeToken}`)}${
    invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ""
  }`;
  const signUpHref = `/sign-up?next=${encodeURIComponent(`/invite/${routeToken}`)}${
    invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ""
  }`;

  useEffect(() => {
    let cancelled = false;
    if (!routeToken) return () => {
      cancelled = true;
    };

    fetch(`/api/invites/${routeToken}`)
      .then(async (response) => {
        if (cancelled) return;
        const payload = (await response.json().catch(() => ({}))) as {
          data?: InvitePayload;
          error?: { message?: string };
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Failed to load invite");
        }
        setInvite(payload.data);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load invite");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeToken]);

  const formattedExpiry = (() => {
    if (!invite?.expiresAt) return null;
    const date = new Date(invite.expiresAt);
    if (Number.isNaN(date.getTime())) return invite.expiresAt;
    return date.toLocaleString();
  })();

  if (!routeToken) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
          <h1 className="text-2xl font-semibold">Invite unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">Invite token is missing.</p>
        </div>
      </main>
    );
  }

  async function acceptInvite() {
    if (!routeToken) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/invites/${routeToken}/accept`, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { accepted: boolean };
        error?: { code?: string; message?: string };
      };

      if (response.status === 401) {
        router.push(signInHref);
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to accept invite");
      }

      setMessage("Invite accepted. Redirecting to workspace.");
      router.push("/app/overview");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Failed to accept invite");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
          <p className="text-sm text-[var(--color-text-soft)]">Loading invite...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
          <h1 className="text-2xl font-semibold">Invite unavailable</h1>
          <p className="mt-2 text-sm text-rose-300">{error}</p>
        </div>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
          <h1 className="text-2xl font-semibold">Invite unavailable</h1>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">No invite record was found.</p>
        </div>
      </main>
    );
  }

  const canAccept = invite.status === "pending";

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
        <h1 className="text-2xl font-semibold">Workspace invite</h1>
        <div className="space-y-1 text-sm text-[var(--color-text-soft)]">
          <p>Email: <span className="text-[var(--color-text-main)]">{invite.email}</span></p>
          <p>Role: <span className="text-[var(--color-text-main)]">{invite.role}</span></p>
          <p>Status: <span className="text-[var(--color-text-main)]">{invite.status}</span></p>
          <p>Expires: <span className="text-[var(--color-text-main)]">{formattedExpiry ?? invite.expiresAt}</span></p>
        </div>
        {canAccept ? (
          <div className="space-y-3">
            <button
              type="button"
              className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => {
                void acceptInvite();
              }}
              disabled={submitting}
            >
              {submitting ? "Accepting..." : "Accept invite"}
            </button>
            <p className="text-xs text-[var(--color-text-soft)]">
              Sign in with <span className="text-[var(--color-text-main)]">{invite.email}</span> to accept this
              invite.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={signInHref}
                className="rounded-xl border border-[var(--color-border-soft)] px-3 py-2 text-xs text-[var(--color-text-main)]"
              >
                Sign in as invitee
              </a>
              <a
                href={signUpHref}
                className="rounded-xl border border-[var(--color-border-soft)] px-3 py-2 text-xs text-[var(--color-text-main)]"
              >
                Create account for invitee
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-soft)]">
            This invite is no longer pending. Ask your workspace owner to issue a new invite if needed.
          </p>
        )}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </main>
  );
}
