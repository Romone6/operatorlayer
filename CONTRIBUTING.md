# Contributing to Operant

Thank you for improving Operant. Start with an issue that names the user problem, real input/output boundary, and the evidence needed to verify the change. Keep pull requests small and independently reviewable.

## Non-negotiable boundaries

- Do not add mock dashboards, canned extraction, fabricated source states, fake integrations, or fake exports.
- Do not add delivery or auto-send. Drafting, evaluation, repair, and export remain human-controlled.
- Preserve organisation isolation, source evidence, private storage, and deletion behaviour.
- Propose connectors, billing, identity providers, webhooks, or MCP as separately approved expansions; they are not changes to this core.

## Local development

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Apply the Supabase migrations before testing persistence. Do not commit `.env.local`, local Supabase state, customer source files, or credentials.

## Change standard

1. Write a focused failing test for every behaviour change.
2. Make the smallest implementation change that passes it.
3. Add an additive migration for every persisted-schema change, together with memory and Supabase repository support.
4. Update the capability ledger and README whenever a user-visible capability or boundary changes.
5. Run the checks below before opening a pull request.

```powershell
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```

Use the pull-request template to state the real data path, verification evidence, and any remaining deployment proof gap.
