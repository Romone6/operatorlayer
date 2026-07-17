const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const optional = ["OPENAI_API_KEY"];

export default function SetupRequiredPage() {
  const missingRequired = required.filter((key) => !process.env[key]);
  const missingOptional = optional.filter((key) => !process.env[key]);
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <div className="glass-card space-y-7 rounded-2xl p-8">
        <div className="space-y-3">
          <p className="section-label">Setup required</p>
          <h1 className="text-3xl font-semibold text-[var(--color-text-main)]">Configure the upload-first core.</h1>
          <p className="text-sm text-[var(--color-text-soft)]">This deployment needs Supabase for authentication and organisation-isolated data. Model processing additionally requires an OpenAI server key.</p>
        </div>
        <section className="rounded-xl border border-white/20 bg-white/70 p-5">
          <h2 className="font-semibold text-[var(--color-text-main)]">Required</h2>
          {missingRequired.length ? <ul className="mt-3 space-y-1 text-sm text-rose-700">{missingRequired.map((key) => <li key={key}><code>{key}</code></li>)}</ul> : <p className="mt-2 text-sm text-emerald-700">Supabase configuration present.</p>}
        </section>
        <section className="rounded-xl border border-white/20 bg-white/70 p-5">
          <h2 className="font-semibold text-[var(--color-text-main)]">Processing</h2>
          {missingOptional.length ? <p className="mt-2 text-sm text-amber-700"><code>OPENAI_API_KEY</code> is missing; upload and review remain available, while model processing returns a clear configuration error.</p> : <p className="mt-2 text-sm text-emerald-700">Model processing key present.</p>}
        </section>
      </div>
    </main>
  );
}
