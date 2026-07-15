import { getConnectorMissingEnv, getMissingEnterpriseEnv } from "@/lib/enterprise/config";

const connectorProviders = [
  "gmail",
  "slack",
  "outlook",
  "hubspot",
  "salesforce",
  "intercom",
  "zendesk",
] as const;

export default function SetupRequiredPage() {
  const missingCore = getMissingEnterpriseEnv();
  const missingOauthState = process.env.OPERATORLAYER_OAUTH_STATE_SECRET ? [] : ["OPERATORLAYER_OAUTH_STATE_SECRET"];
  const connectorMissing = connectorProviders.flatMap((provider) => getConnectorMissingEnv(provider));
  const totalRequired = 4 + 1 + 17;
  const missingTotal = new Set([...missingCore, ...missingOauthState, ...connectorMissing]).size;
  const configuredCount = Math.max(0, totalRequired - missingTotal);
  const readinessPct = Math.round((configuredCount / totalRequired) * 100);
  const isReady = missingTotal === 0;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <div className="glass-card space-y-8 rounded-2xl p-8">
        <div className="space-y-3">
          <p className="section-label">Enterprise setup required</p>
          <h1 className="text-3xl font-semibold text-[var(--color-text-main)]">
            Authenticated app access is fail-closed until environment prerequisites are configured.
          </h1>
          <p className="text-sm text-[var(--color-text-soft)]">
            This page shows the real runtime state from server environment checks. No placeholder readiness data is used.
          </p>
        </div>

        <section className="space-y-2 rounded-xl border border-white/20 bg-white/70 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-text-main)]">Readiness meter</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
              {isReady ? "ready" : "blocked"}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[var(--color-surface-muted)]">
            <div
              className="h-2.5 rounded-full bg-[var(--color-accent-cyan)] transition-all"
              style={{ width: `${readinessPct}%` }}
            />
          </div>
          <p className="text-sm text-[var(--color-text-soft)]">
            {configuredCount}/{totalRequired} prerequisites configured ({readinessPct}%).
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-white/20 bg-white/70 p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Core runtime configuration</h3>
            <p className="mt-2 text-xs text-[var(--color-text-soft)]">
              Required for authenticated runtime, control-plane APIs, and signed connector OAuth state.
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--color-text-main)]">
              Status: {missingCore.length + missingOauthState.length === 0 ? "Complete" : `Action required (${missingCore.length + missingOauthState.length} missing)`}
            </p>
            {missingCore.length + missingOauthState.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-[var(--color-text-soft)]">
                {[...missingCore, ...missingOauthState].map((key) => (
                  <li key={key}>
                    <code>{key}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>

          <article className="rounded-xl border border-white/20 bg-white/70 p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Connector credentials baseline</h3>
            <p className="mt-2 text-xs text-[var(--color-text-soft)]">
              Required before provider-deep OAuth/sync workflows can become sell-ready.
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--color-text-main)]">
              Status: {connectorMissing.length === 0 ? "Complete" : `Action required (${connectorMissing.length} missing)`}
            </p>
            {connectorMissing.length > 0 ? (
              <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-xs text-[var(--color-text-soft)]">
                {connectorMissing.map((key) => (
                  <li key={key}>
                    <code>{key}</code>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </section>

        <section className="space-y-2 rounded-xl border border-white/20 bg-white/70 p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-main)]">Operator actions</h2>
          <p className="text-xs text-[var(--color-text-soft)]">
            Apply environment variables, restart the server, then rerun readiness checks.
          </p>
          <pre className="overflow-auto rounded-lg bg-[var(--color-bg-deep)] p-3 text-xs text-white">
{`npm.cmd run test:smoke:prod-readiness
npm.cmd run test:smoke:ops-readiness
npm.cmd run test:release-gate`}
          </pre>
        </section>
      </div>
    </main>
  );
}
