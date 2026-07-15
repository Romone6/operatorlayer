import { EmailAuthForm } from "@/components/auth/email-auth-form";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string; email?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next, email } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <EmailAuthForm mode="sign-up" nextPath={next ?? null} initialEmail={email ?? null} />
    </main>
  );
}
