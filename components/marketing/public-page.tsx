import Link from "next/link";

type PublicPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  items: Array<{ title: string; body: string }>;
};

export function PublicPage({ eyebrow, title, summary, items }: PublicPageProps) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">{eyebrow}</p>
      <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.04em] md:text-7xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-text-muted)]">{summary}</p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <section key={item.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-6">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-12 flex flex-wrap gap-4 text-sm font-medium">
        <Link href="/sign-in" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white">Open the app</Link>
        <Link href="/docs" className="rounded-lg border border-[var(--color-border)] px-4 py-2">Read the documentation</Link>
      </div>
    </main>
  );
}
