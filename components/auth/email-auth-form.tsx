"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function EmailAuthForm(props: {
  mode: "sign-in" | "sign-up";
  nextPath?: string | null;
  initialEmail?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(props.initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase browser auth is not configured.");
      return;
    }

    if (props.mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        const nextPath = props.nextPath;
        router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/app/overview");
        return;
      }
      setMessage("Sign-up submitted. Check your inbox for confirmation.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMessage("Signed in successfully.");
    const nextPath = props.nextPath;
    router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/app/overview");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-card)] p-6">
      <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
        {props.mode === "sign-in" ? "Sign In" : "Sign Up"}
      </h1>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--color-text-muted)]">Email</span>
        <input
          className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--color-text-muted)]">Password</span>
        <input
          className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background-panel)] px-3 py-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <button className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white" type="submit">
        {props.mode === "sign-in" ? "Sign In" : "Create Account"}
      </button>
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
