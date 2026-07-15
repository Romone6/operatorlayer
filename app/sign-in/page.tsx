import { EmailAuthForm } from "@/components/auth/email-auth-form";

type SignInPageProps = {
  searchParams: Promise<{ next?: string; email?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { next, email } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <EmailAuthForm mode="sign-in" nextPath={next ?? null} initialEmail={email ?? null} />
    </main>
  );
}
