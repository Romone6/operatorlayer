export function LogoCloud() {
  const logos = ["Slack", "Gmail", "Google Drive", "Notion", "HubSpot", "Salesforce", "Zendesk", "GitHub"];
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-background-panel)] px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <p className="section-label text-center">Works with the tools modern teams already use</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {logos.map((logo) => <div key={logo} className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">{logo}</div>)}
        </div>
      </div>
    </section>
  );
}
