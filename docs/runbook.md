# OperatorLayer Runbook (Frontend Rebuild)

## Prerequisites

- Node.js 24+
- pnpm 10+
- npm (fallback path on Windows when `pnpm` is unavailable)

## Local setup

```powershell
Copy-Item .env.example .env.local
pnpm install
# fallback
npm install
```

## Local Supabase (for DB-backed validation)

```powershell
npx supabase init
npx supabase start
```

Use local Supabase credentials for DB-backed runs:

```powershell
npx supabase status -o env
```

## Run app

```powershell
pnpm dev
```

## Test commands

```powershell
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm test:smoke:prod-readiness
pnpm test:smoke:ops-readiness
pnpm test:smoke:governance-controls
pnpm test:smoke:connector-providers
pnpm test:smoke:stripe-webhook-replay
pnpm test:smoke:webhook-event-subscriptions
pnpm test:smoke:auto-send-kill-switch
npm.cmd run test:smoke:mcp-conformance
pnpm test:smoke:job-idempotency
pnpm test:smoke:queue-replay-disaster
pnpm test:smoke:evaluation-explainability
pnpm test:smoke:saml-metadata-ingestion
pnpm test:smoke:provider-outage-chaos
pnpm test:smoke:ops-drill-scripts
pnpm test:smoke:scim-drift-reconcile
pnpm test:smoke:release-decision-completion-audit
# fallback gate on Windows
npm.cmd run test:release-gate
```

Single-command gate sweep (Windows PowerShell):

```powershell
npm.cmd run test:release-gate
```

Extended gate (includes DB-backed Supabase smoke with automatic start/stop):

```powershell
npm.cmd run test:release-gate:extended
```

Direct E2E gate command on Windows now uses the stable harness script:

```powershell
npm.cmd run test:e2e
```

Windows E2E gate (stable in restricted environments where bundled Chromium launch is blocked):

```powershell
$env:OPERATORLAYER_DATA_BACKEND='memory'
$env:OPERATORLAYER_TEST_AUTH_BYPASS='1'
$env:OPERATORLAYER_ALLOW_TEST_BYPASS='1'
$env:OPERATORLAYER_TEST_USER_ID='e2e-user-001'
$env:OPERATORLAYER_TEST_ORG_ID='e2e-org-001'
$env:OPERATORLAYER_PROCESSING_MODE='deterministic'
$env:OPERATORLAYER_INLINE_JOB_RUNNER='1'
$dev = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','3101' -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 12
try {
  $env:PLAYWRIGHT_BASE_URL='http://localhost:3101'
  $env:PLAYWRIGHT_REUSE_EXISTING_SERVER='1'
  $env:PLAYWRIGHT_CHANNEL='msedge'
  npm.cmd run test:e2e -- --reporter=line --workers=1
} finally {
  Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue
}
```

## Phase 2 DB-backed smoke proof

This validates the real migration/application path against local Supabase (not memory mode):

```powershell
$status = npx supabase status -o env
foreach ($line in $status) {
  if ($line -match '^([A-Z0-9_]+)=\"(.*)\"$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
$env:OPERATORLAYER_DATA_BACKEND='supabase'
$env:NEXT_PUBLIC_SUPABASE_URL=$env:API_URL
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:ANON_KEY
$env:SUPABASE_SERVICE_ROLE_KEY=$env:SERVICE_ROLE_KEY
$env:SUPABASE_STORAGE_BUCKET='operatorlayer-sources'
$env:OPERATORLAYER_TEST_AUTH_BYPASS='1'
$env:OPERATORLAYER_ALLOW_TEST_BYPASS='1'
$env:OPERATORLAYER_INLINE_JOB_RUNNER='1'
$env:OPERATORLAYER_PROCESSING_MODE='deterministic'
pnpm test:smoke:supabase
```

Cleanup:

```powershell
npx supabase stop
```

## Demo flow

1. Open `http://localhost:3000/app/sources`.
2. Upload a source (no manual identity headers in UI).
3. Verify records appear in:
   - `/app/terminology`
   - `/app/policies`
   - `/app/scenarios`
   - `/app/review-queue`

## Invite delivery and onboarding

- Invite delivery providers (in order):
1. Resend API (`RESEND_API_KEY`, `OPERATORLAYER_INVITE_FROM_EMAIL`)
2. Supabase Auth admin invite fallback (if Supabase env is configured)
3. Mail client fallback (`OPERATORLAYER_ENABLE_MAILTO_FALLBACK=1`) for manual outbound send

- Optional fail-closed delivery:
`OPERATORLAYER_REQUIRE_INVITE_EMAIL_DELIVERY=1`

When fail-closed is enabled and automatic delivery is unavailable, invites are queued with `invite_delivery` jobs and can be resent from Settings.

- Resend invite API:
`POST /api/members/invites/{id}/resend`

- Invite acceptance path:
`/invite/{token}`

## Enterprise API surface (new)

- Feature flags: `GET/PATCH /api/feature-flags`
  - Governance matrix: `GET /api/feature-flags/matrix`
- Approval policies: `GET/POST /api/approval-policies`, `PATCH /api/approval-policies/{id}`
- Connectors: 
  - `GET/POST /api/connectors`
  - `GET /api/connectors/catalog`
  - `GET /api/connectors/{provider}/oauth/start`
  - `GET /api/connectors/{provider}/oauth/callback`
  - `POST /api/connectors/{provider}/sync`
  - `POST /api/connectors/{provider}/backfill`
  - `GET /api/connectors/{provider}/sync-runs`
  - `POST /api/connectors/{provider}/revoke`
- Auto-send governance: `POST /api/auto-send/decide`, `GET /api/send-events`
- Auto-send kill switches: `GET/PATCH /api/auto-send/kill-switch` (global + workspace scope)
- Send-event detail: `GET /api/send-events/{id}`
- Evaluation explainability pack: `GET /api/evaluations/{id}/explainability`
- API keys: `GET/POST /api/api-keys`, `POST /api/api-keys/{id}/revoke`
- LLM BYOK provider keys: `GET/POST /api/llm/providers`, `POST /api/llm/providers/{id}/revoke`
- Webhooks:
  - `GET/POST /api/webhooks`
  - `POST /api/webhooks/{id}/rotate`
  - `POST /api/webhooks/{id}/disable`
  - `GET/POST /api/webhooks/{id}/replay`
  - `POST /api/webhooks/dispatch`
  - Event subscriptions are enforced (`*`, exact event, and namespace wildcard like `send_event.*`).
- Billing:
  - `GET/PATCH /api/billing/entitlements`
  - `GET /api/billing/entitlements/effective`
  - `GET /api/billing/usage`
  - `POST /api/billing/stripe/webhook`
  - `POST /api/billing/reconcile/{providerEventId}`
- SSO/SCIM:
  - `GET/PATCH /api/sso/config` (`PATCH` supports either manual IdP fields or `idpMetadataXml` ingestion)
  - `GET /api/saml/metadata`
  - `GET /api/saml/login`, `POST /api/saml/acs`
  - `POST /api/scim/provision`
  - `SCIM v2 /api/scim/v2/Users`, `/api/scim/v2/Groups`
  - `POST /api/scim/v2/reconcile?apply=1`
- Audit:
  - `GET /api/audit/events`
- Data governance simulation:
  - `POST /api/data-governance/policies/simulate`
- Break-glass governance protocol:
  - `GET/POST/PATCH /api/data-governance/break-glass`
- Legal hold lifecycle governance:
  - `GET/POST/PATCH /api/data-governance/legal-hold`
- Deletion lifecycle governance:
  - `GET/POST /api/data-governance/deletion-requests`
  - `POST /api/data-governance/deletion-requests/{id}/complete`
- Connector health:
  - `GET /api/connectors/{provider}/health`
  - Health payload includes scope status, token expiry health, throttling state, last successful sync, sync lag, and failure reasons.
- MCP discovery: `GET /api/mcp/capabilities`
- MCP invocation: `POST /api/mcp`
- MCP audit: `GET /api/mcp/audit`
- OpenAPI: `GET /api/v1/openapi`
- Release board: `GET /api/enterprise/readiness-board`
- Enterprise onboarding checklist: `GET /api/enterprise/onboarding-checklist`
- Integrated release decision: `GET /api/enterprise/release-decision` (includes runtime `evidenceSignals`, explicit `compliancePosture` with `certificationClaim: "not_claimed"`, requirement-level `closureAudit` verdicts including non-negotiables, and 10-domain closure assessments with `ready`, `blocked`, and `verification_gap` states)
  - `objectiveCoverage` is also included and must remain a one-to-one projection of `closureAudit.requirements` with explicit scope labels:
    - `domain` for the 10 core closure domains
    - `compliance` for SOC2-readiness evidence and unsupported-certification controls
    - `runtime_safety` for runtime-disabled unsupported-capability enforcement
    - `non_negotiable` for no-fake-data, permissioned-ingestion, human-governance, customer-owned-data, and evidence-first output controls
- Queue metrics: `GET /api/jobs/metrics?windowHours=24`
- Job failure taxonomy + replay candidates: `GET /api/jobs/failure-taxonomy?windowHours=24`
- Job-producing APIs support request replay safety via `Idempotency-Key` header (source processing, connector sync/backfill, webhook dispatch/replay, review reprocessing).

## TypeScript SDK starter

- Starter path: `sdk/typescript`
- Entry point: `sdk/typescript/src/index.ts`
- Starter includes:
  - API key + org header wiring
  - standard error-envelope mapping to `OperatorLayerError`
  - methods for metadata, OpenAPI, evaluations, connector health, webhook replay list/trigger

Quick validation:

```powershell
npm.cmd run test -- tests/unit/typescript-sdk-client.test.ts
```

## Prod readiness closure smoke

```powershell
pnpm test:smoke:prod-readiness
```

This command validates:
- enterprise feature flags enabled,
- SSO config persisted,
- billing entitlement active,
- go/no-go readiness endpoint response.

## Operations readiness smoke

```powershell
pnpm test:smoke:ops-readiness
```

This command validates:
- readiness board contract and go/no-go state generation,
- incident severity mapping and SLO target payload,
- required operations + procurement evidence docs exist.

## Release decision completion-audit smoke

```powershell
pnpm test:smoke:release-decision-completion-audit
```

This command validates:
- single integrated release-decision behavior in one run for both paths:
  - baseline fail-closed `no_go` with explicit domain blockers/verification gaps,
  - fully-evidenced `go` with all domains ready and all closure requirements proved,
- exact domain and closure requirement ID-set coverage (no missing/extra/duplicate IDs),
- objective-coverage parity with closure requirements (exact ID match, scope classification, and status/evidence/gap/next-action alignment),
- non-negotiables and SOC2-ready evidence posture checks without unsupported certification claims,
- runtime-disabled unsupported capability behavior and explicit unavailable-capability labeling.

## Governance controls smoke

```powershell
pnpm test:smoke:governance-controls
```

This command validates:
- governance policy persistence for invite/session/MFA/break-glass indicators,
- domain allowlist invite enforcement (blocked + allowed path),
- owner/admin governance control execution path in memory backend,
- pre-apply governance simulation for retention/legal-hold impact with explicit blocked-action evidence,
- legal hold lifecycle place/release controls with immutable audit state,
- break-glass invocation/release lifecycle with auditable state transitions,
- deletion approval/completion proof contract and dependent-artifact handling state.

## Connector provider smoke

```powershell
pnpm test:smoke:connector-providers
```

This command validates:
- connector fail-closed behavior when feature flags are disabled,
- connector fail-closed behavior when provider env is missing,
- OAuth start availability once feature + env prerequisites are met,
- per-provider health contract (`available` + `not_connected`) before OAuth callback,
- sync fail-closed behavior (`404 connector_not_connected`) before provider connection.

## Stripe webhook replay smoke

```powershell
pnpm test:smoke:stripe-webhook-replay
```

This command validates:
- Stripe signature verification path for webhook ingest,
- replay safety behavior for repeated provider event ids,
- provider event reconciliation endpoint behavior.

## MCP conformance smoke

```powershell
npm.cmd run test:smoke:mcp-conformance
```

This command validates:
- capability discovery behavior before/after `mcp_actions` flag enablement,
- API-key scoped MCP tool invocation,
- MCP audit permission mediation (`api-admin` capability required for admin),
- MCP audit event listing contract.

Focused Pass 3 completion verification:

```powershell
npm.cmd run test:integration -- tests/integration/mcp-invocation-api.test.ts
npm.cmd run test -- tests/unit/typescript-sdk-client.test.ts
npm.cmd run test:smoke:mcp-conformance
npm.cmd run test:smoke:api-mcp-docs
npm.cmd run lint
npm.cmd run build
```

## Runtime governance smoke

```powershell
npm.cmd run test:smoke:runtime-governance
```

This command validates:
- API-key scoped `POST /api/v1/runtime/governance` invocation,
- persisted agent governance config lookup and enforcement,
- policy/scenario-backed evaluation and repair suggestion,
- governance-mode decision output with notification intent,
- immutable runtime audit event recording,
- no message sending or auto-send job creation (`sendState = not_sent`).

Focused Pass 4 completion verification:

```powershell
npm.cmd run test:integration -- tests/integration/runtime-governance-api.test.ts
npm.cmd run test:smoke:runtime-governance
npm.cmd run test:smoke:api-mcp-docs
npm.cmd run lint
npm.cmd run build
```

## Versioned export packs smoke

```powershell
npm.cmd run test:smoke:versioned-export-packs
```

This command validates:
- uploaded source material can produce two sequential export packs,
- required legacy and agent-ready artifacts are present,
- manifest version, checksum, signature, and rollback pointers verify,
- `policy_version_manifest.json` and `agent_permissions.json` download successfully,
- MVP agent permissions require runtime governance and do not grant auto-send.

## Dynamic testing and calibration smoke

```powershell
npm.cmd run test:smoke:dynamic-testing
```

This command validates:
- uploaded source material generates a dynamic test suite from real policies and scenarios,
- generated suite runs persist auditable evaluation-backed test run records,
- failed suite outcomes create calibration recommendations,
- high-risk calibration recommendations require human review,
- reviewed calibration recommendations remain unapplied unless a later approved rollout path is implemented.

## Notification routing smoke

```powershell
npm.cmd run test:smoke:notification-routing
```

This command validates:
- runtime governance decisions attach notification routing records,
- dashboard notifications are audit-recorded,
- webhook notifications queue signed `webhook_delivery` jobs,
- unsupported Slack destinations are labelled unavailable instead of implied live,
- failed webhook delivery is retained for replay,
- replayed webhook delivery succeeds against a local HTTP receiver without exposing raw draft text.

## Client dashboard surfaces smoke

```powershell
npm.cmd run test:smoke:client-dashboard-surfaces
```

This command validates:
- Developer, Testing, and Notifications dashboard pages exist and are linked from the app sidebar,
- developer setup APIs return real API key, MCP, and BYOK states,
- dynamic testing and calibration dashboard APIs return real empty states,
- notification destinations expose explicit webhook and unsupported-provider availability states,
- export dashboard source includes version and rollback metadata.

## Product-side auth target

Current implementation retains Supabase Auth for the upload-based MVP. Owner direction on 2026-06-06 is to retain Supabase Auth continuing forward unless stated otherwise and document Better Auth as a future migration interest.

Current-state inspection commands:

```powershell
rg -n "better-auth|Better Auth|supabase|createClient|auth" app lib components package.json
Get-Content docs\better-auth-migration-prd.md
```

Pass 2 is resolved for the current product-side milestone with Supabase Auth as the auth target. Do not claim Better Auth is implemented unless a future migration is explicitly approved, implemented, and verified with the migration commands in `docs/better-auth-migration-prd.md`.

Completion verification:

```powershell
npm.cmd run test -- tests/unit/supabase-config.test.ts tests/unit/authorization.test.ts tests/unit/member-invites.test.ts
npm.cmd run test:integration -- tests/integration/auth-target-contract.test.ts tests/integration/fail-closed-auth.test.ts tests/integration/authorization-members-api.test.ts tests/integration/member-invites-api.test.ts tests/integration/enterprise-onboarding-checklist.test.ts
npm.cmd run test:smoke:auth-target
npm.cmd run lint
npm.cmd run build
```

## Production-like proof blockers

The commands below are the next proof path once real test credentials/tenants are available. They are not a substitute for the local smoke suite; they are the evidence required for Pass 10.

Set the common app environment:

```powershell
$env:OPERATORLAYER_DATA_BACKEND='supabase'
$env:NEXT_PUBLIC_SUPABASE_URL='<supabase-project-url>'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='<supabase-anon-key>'
$env:SUPABASE_SERVICE_ROLE_KEY='<supabase-service-role-key>'
$env:SUPABASE_STORAGE_BUCKET='operatorlayer-sources'
$env:OPERATORLAYER_SECRET_ENCRYPTION_KEY='<32-byte-secret>'
$env:OPERATORLAYER_PROCESSING_MODE='deterministic'
$env:OPERATORLAYER_INLINE_JOB_RUNNER='1'
$env:OWNER_ACCESS_TOKEN='<supabase-owner-admin-access-token>'
$app = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','3101' -PassThru -WindowStyle Hidden
```

Connector OAuth/sync/backfill proof for Gmail:

```powershell
$env:OPERATORLAYER_OAUTH_STATE_SECRET='<32-byte-oauth-state-secret>'
$env:GOOGLE_CLIENT_ID='<google-oauth-client-id>'
$env:GOOGLE_CLIENT_SECRET='<google-oauth-client-secret>'
$ownerHeaders = @{ Authorization="Bearer $env:OWNER_ACCESS_TOKEN" }
Invoke-RestMethod -Method PATCH -Uri 'http://localhost:3101/api/feature-flags' -Headers $ownerHeaders -ContentType 'application/json' -Body '{"key":"connector_gmail","enabled":true,"rolloutPercent":100}'
Invoke-RestMethod -Method GET -Uri 'http://localhost:3101/api/connectors/gmail/oauth/start?redirectUri=http%3A%2F%2Flocalhost%3A3101%2Fapi%2Fconnectors%2Fgmail%2Foauth%2Fcallback' -Headers $ownerHeaders
# Complete the returned authUrl in a browser with the real Google test tenant, then verify the callback records a connected connector.
Invoke-RestMethod -Method POST -Uri 'http://localhost:3101/api/connectors/gmail/sync' -Headers $ownerHeaders
Invoke-RestMethod -Method POST -Uri 'http://localhost:3101/api/connectors/gmail/backfill' -Headers $ownerHeaders -ContentType 'application/json' -Body '{"days":30}'
```

SAML and SCIM proof:

```powershell
$env:OPERATORLAYER_SCIM_TOKEN='<scim-proof-token>'
$ownerHeaders = @{ Authorization="Bearer $env:OWNER_ACCESS_TOKEN" }
$metadataXml = Get-Content -Raw .\tmp\idp-metadata.xml
Invoke-RestMethod -Method PATCH -Uri 'http://localhost:3101/api/sso/config' -Headers $ownerHeaders -ContentType 'application/json' -Body (@{ enabled=$true; idpMetadataXml=$metadataXml; domainAllowlist=@('example.com') } | ConvertTo-Json -Depth 5)
Invoke-RestMethod -Method GET -Uri 'http://localhost:3101/api/saml/login?redirectTo=/app' -Headers $ownerHeaders
$scimHeaders = @{ Authorization="Bearer $env:OPERATORLAYER_SCIM_TOKEN" }
Invoke-RestMethod -Method POST -Uri 'http://localhost:3101/api/scim/v2/reconcile?apply=1' -Headers $scimHeaders
```

Stripe test-mode entitlement proof:

```powershell
$env:STRIPE_SECRET_KEY='<stripe-test-secret-key>'
$env:STRIPE_WEBHOOK_SECRET='<stripe-test-webhook-secret>'
$ownerHeaders = @{ Authorization="Bearer $env:OWNER_ACCESS_TOKEN" }
Invoke-RestMethod -Method GET -Uri 'http://localhost:3101/api/billing/entitlements' -Headers $ownerHeaders
# Forward or post a signed Stripe test event to /api/billing/stripe/webhook, then reconcile:
Invoke-RestMethod -Method POST -Uri 'http://localhost:3101/api/billing/reconcile?apply=1' -Headers $ownerHeaders
```

Final readiness check after the real provider/IdP/Stripe proofs:

```powershell
npm.cmd run test:smoke:connector-providers
npm.cmd run test:smoke:saml-metadata-ingestion
npm.cmd run test:smoke:scim-drift-reconcile
npm.cmd run test:smoke:stripe-webhook-replay
npm.cmd run test:smoke:release-decision-completion-audit
Invoke-RestMethod -Method GET -Uri 'http://localhost:3101/api/enterprise/release-decision' -Headers $ownerHeaders
Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
```

## LLM BYOK routing proof

```powershell
npm.cmd run test:integration -- tests/integration/llm-provider-keys.test.ts
npm.cmd run test -- tests/unit/llm-routing.test.ts
```

This command validates:

- owner/admin `api-admin` enforcement for provider-key management,
- encrypted provider-key persistence with raw and encrypted secrets excluded from API responses,
- audit metadata redaction for provider-key events,
- active organisation OpenAI key resolution for BYOK routing,
- explicit unavailable failure for active providers without live routing adapters.

## SCIM drift reconcile smoke

```powershell
pnpm test:smoke:scim-drift-reconcile
```

This command validates:
- SCIM drift detection for missing status and orphaned status evidence,
- apply-mode remediation for remediable drift classes,
- immutable audit marker emission for each reconcile run (`enterprise:scim_drift_reconcile_run`).

## Queue replay disaster smoke

```powershell
pnpm test:smoke:queue-replay-disaster
```

This command validates:
- dead-letter queue blocker detection on readiness board,
- replay path for `POST /api/jobs/{id}/replay`,
- worker recovery path via `POST /api/jobs/worker`,
- queue blocker clearance after successful replay execution.

## Evaluation explainability smoke

```powershell
pnpm test:smoke:evaluation-explainability
```

This command validates:
- explainability pack retrieval for a saved evaluation run,
- scoring/violation/risk fields and evidence references,
- repair traceability diff presence for repaired drafts.

## Provider outage chaos smoke

```powershell
pnpm test:smoke:provider-outage-chaos
```

This command validates:
- provider outage failure classification (`provider_unavailable`) in failure taxonomy,
- connector health failure-reason propagation for outage conditions,
- readiness-board queue-failure blocker surfacing during outage simulation.

## Operator drill scripts

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops-backup-restore-drill.ps1 -DryRun
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops-queue-replay-drill.ps1 -DryRun
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops-provider-outage-drill.ps1 -DryRun
```

`pnpm test:smoke:ops-drill-scripts` validates all drill scripts are runnable in dry-run mode.

## Operant homepage product-led demo proof

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm exec playwright test tests/e2e/marketing-product-led.spec.ts
pnpm remotion:still
pnpm remotion:render
```

This command set validates:
- homepage hero tabs for Queue, Policies, Scenarios, and Audit,
- embedded product-demo video and poster paths,
- guided product journey interaction without pinned-scroll blank space,
- scenario workflow sheet viewport placement and scrollability,
- Remotion `OperantProductDemo` poster/video generation commands.
