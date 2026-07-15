import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { isSupabaseConfigured, isTestAuthBypassEnabled } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";

async function ensureAppAccess() {
  if (isTestAuthBypassEnabled()) {
    return;
  }

  if (!isSupabaseConfigured()) {
    redirect("/setup-required");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    redirect("/setup-required");
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/sign-in");
  }

  const membership = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();
  if (!membership.data) {
    redirect("/onboarding");
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureAppAccess();
  return <AppShell>{children}</AppShell>;
}
