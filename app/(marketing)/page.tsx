import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-20">
      <section className="max-w-3xl space-y-7">
        <p className="section-label">Open-source communication governance</p>
        <h1 className="text-5xl font-semibold tracking-[-0.06em] text-[var(--color-text-main)]">Turn authorised company material into reviewable agent guidance.</h1>
        <p className="text-lg leading-8 text-[var(--color-text-muted)]">Give your AI clear, reviewable guidance from the documents your team already trusts. Add a source and Operant starts extracting policies, terminology, scenarios, and conflicts automatically.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white" href="/sign-up">Run it locally</Link>
          <Link className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold" href="/docs">Read the documentation</Link>
        </div>
      </section>
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[['1. Add', 'Upload a document or paste approved text.'], ['2. Extract', 'Operant starts extracting guidance straight away.'], ['3. Review and use', 'Approve the evidence, then generate, check, repair, or export drafts.']].map(([title, body]) => <article key={title} className="glass-card rounded-2xl p-6"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p></article>)}
      </section>
      <p className="mt-12 text-sm text-[var(--color-text-soft)]">No live Gmail, Slack, or CRM connectors. No auto-send. No fabricated product data.</p>
    </main>
  );
}
