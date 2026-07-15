"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/organisations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, industry }),
      });
      const payload = (await response.json()) as { data?: { id?: string }; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to create organisation");
      }
      setMessage(`Organisation created: ${payload.data?.id}`);
      router.push("/app/overview");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create organisation");
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
        <h1 className="text-2xl font-semibold">Organisation Onboarding</h1>
        <p className="text-sm text-[var(--color-text-soft)]">Create your organisation record to start governed ingestion.</p>
        <input
          className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Organisation name"
          required
        />
        <input
          className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          placeholder="Industry"
        />
        <button className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white" type="submit">
          Create Organisation
        </button>
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </form>
    </main>
  );
}
