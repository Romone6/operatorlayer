# OperatorLayer Product-Side Completion Plan

Date: 2026-06-02
Workspace: `C:\OperatorLayer\operatorlayer-app`

## Objective

Complete the product side of OperatorLayer against `docs/product-vision.md` without fake data, fake integrations, fake processed states, or unverified success claims.

This plan is progressive. Each pass must leave the product more true to the complete product vision and must include local Windows PowerShell verification before it can be called complete.

## Current Baseline

The current repo already has:

- upload-based source ingestion,
- extraction, policy, terminology, scenario, conflict, review queue, playground, evaluation, repair, and export surfaces,
- authenticated app pages with real empty states,
- Supabase-backed sign-in/sign-up and organisation onboarding,
- API v1 docs, OpenAPI, API key routes, and TypeScript SDK starter,
- MCP capability and audit endpoints,
- connector OAuth/sync route surfaces with fail-closed availability,
- enterprise readiness, release decision, SAML/SCIM, billing, governance, audit, and operations surfaces.

The product is not complete because the updated vision still requires product capabilities that are either partial, absent, or only locally simulated.

## Completion Passes

### Pass 1 - Client BYOK And LLM Routing Foundation

Status: Implemented locally on 2026-06-02.

Goal: Let a customer configure provider keys and route eligible org-scoped LLM work through an active provider without exposing raw secrets.

Deliverables:

- Admin API for LLM provider keys.
- Encrypted secret persistence using `OPERATORLAYER_SECRET_ENCRYPTION_KEY`.
- Secret redaction from audit metadata.
- Org-scoped routing helper for OpenAI BYOK.
- Explicit unavailable state for non-implemented providers.
- Unit and integration coverage.
- Runbook command.

Done when:

- Provider key create/list/revoke tests pass.
- Routing helper tests prove OpenAI BYOK selection and unsupported-provider failure.
- Audit responses do not expose raw or encrypted provider keys.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/llm-provider-keys.test.ts`
- `npm.cmd run test -- tests/unit/llm-routing.test.ts`
- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run test:smoke:api-mcp-docs`
- `npm.cmd run test:smoke:mcp-conformance`

### Pass 2 - Auth Target Decision And Future Better Auth Path

Status: Implemented locally on 2026-06-06. Supabase Auth remains the current implemented auth provider unless the owner states otherwise.

Goal: Preserve the implemented auth target without breaking organisation isolation and document Better Auth as a future migration interest.

Deliverables:

- Supabase Auth retained for the upload-based MVP.
- Documented assumption in `docs/ASSUMPTIONS.md`.
- Better Auth future migration PRD in `docs/better-auth-migration-prd.md`.
- Tests for sign-up, sign-in, session guard, onboarding, invite acceptance, and fail-closed unauthenticated API access.

Current evidence:

- Owner direction on 2026-06-06: retain Supabase Auth continuing forward unless stated otherwise; document future interest in Better Auth migration.
- `package.json` contains `@supabase/ssr` and `@supabase/supabase-js` but no Better Auth dependency.
- `app/sign-in/page.tsx`, `app/sign-up/page.tsx`, `app/app/layout.tsx`, `lib/auth/context.ts`, and `components/auth/email-auth-form.tsx` still use Supabase Auth/session primitives.
- The current milestone assumption is recorded in `docs/ASSUMPTIONS.md`.
- Future migration requirements are recorded in `docs/better-auth-migration-prd.md`.
- Current verification:
  - `npm.cmd run test -- tests/unit/supabase-config.test.ts tests/unit/authorization.test.ts tests/unit/member-invites.test.ts`
  - `npm.cmd run test:integration -- tests/integration/auth-target-contract.test.ts tests/integration/fail-closed-auth.test.ts tests/integration/authorization-members-api.test.ts tests/integration/member-invites-api.test.ts tests/integration/enterprise-onboarding-checklist.test.ts`
  - `npm.cmd run test:smoke:auth-target`
  - `npm.cmd run lint`
  - `npm.cmd run build`

### Pass 3 - Full MCP Invocation Surface

Status: Implemented locally on 2026-06-02 and re-verified on 2026-06-06.

Goal: Move MCP beyond discovery/audit into callable, audited tool execution.

Deliverables:

- `POST /api/mcp` or versioned equivalent for tool invocation.
- Supported tools for policy pack fetch, draft evaluation, and draft repair.
- API-key/org auth and scope enforcement.
- Success and failure audit events for every invocation.
- MCP docs and SDK examples.
- Conformance smoke that calls real tools with real org records.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/mcp-invocation-api.test.ts`
- `npm.cmd run test -- tests/unit/typescript-sdk-client.test.ts`
- `npm.cmd run test:smoke:mcp-conformance`
- `npm.cmd run test:smoke:api-mcp-docs`
- `npm.cmd run lint`
- `npm.cmd run build`

### Pass 4 - Runtime Governance API

Status: Implemented locally on 2026-06-02 and re-verified on 2026-06-06.

Goal: Provide the fast runtime decision API described in the product vision.

Deliverables:

- Versioned runtime endpoint for scenario detection, policy pack reference, draft evaluation, repair suggestion, approval decision, escalation decision, notification intent, and audit logging.
- Per-agent/channel/use-case governance input.
- No full regression execution on runtime path.
- Runtime audit record with policy/evidence pointers.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/runtime-governance-api.test.ts`
- `npm.cmd run test:smoke:runtime-governance`
- `npm.cmd run test:smoke:api-mcp-docs`
- `npm.cmd run lint`
- `npm.cmd run build`

### Pass 5 - Agent Configuration And Governance Modes

Status: Implemented locally on 2026-06-02.

Goal: Make governance configurable per agent, channel, team, use case, risk level, and customer segment.

Deliverables:

- Agent registry and settings APIs.
- Governance mode persistence: suggest only, human approval required, conditional approval, final authority, notify only.
- UI for agent/runtime settings.
- Runtime enforcement tests for each mode.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/runtime-governance-api.test.ts`
- `npm.cmd run test:smoke:runtime-governance`
- `npm.cmd run test:smoke:api-mcp-docs`
- `npm.cmd run build`
- `npm.cmd run lint`
- `npm.cmd run test`

### Pass 6 - Versioned Agent-Ready Packs

Status: Implemented locally on 2026-06-02.

Goal: Upgrade exports into versioned, rollback-capable product artifacts.

Deliverables:

- Existing required artifacts retained.
- New vision artifacts added: `company_identity.json`, `knowledge_pack.json`, `sales_positioning_pack.json`, `support_resolution_pack.json`, `escalation_hierarchy.json`, `agent_permissions.json`, `runtime_governance_policy.json`, `test_suite_manifest.json`, `agent_alignment_report.json`, and `policy_version_manifest.json`.
- Version manifest, checksum, rollback pointer, and source evidence for each pack.
- Download and verification tests.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/versioned-export-packs.test.ts`
- `npm.cmd run test:smoke:versioned-export-packs`

### Pass 7 - Dynamic Tests And Calibration Loop

Status: Implemented locally on 2026-06-02.

Goal: Generate tests from real policies, scenarios, approved/rejected examples, and audit failures.

Deliverables:

- Test-suite generation API.
- Test run records.
- Calibration recommendation records.
- Human approval workflow for high-risk changes.
- Regression smoke using uploaded source material.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/dynamic-testing-api.test.ts`
- `npm.cmd run test:smoke:dynamic-testing`
- `npm.cmd run test:smoke:api-mcp-docs`

### Pass 8 - Notifications And Escalation

Status: Implemented locally on 2026-06-02.

Goal: Make notification routing real for at least one destination and explicit for unavailable destinations.

Deliverables:

- Notification destination config.
- Webhook destination as first real destination.
- Slack/Linear/Teams/email marked unavailable until configured and tested.
- Notification records attached to runtime decisions.
- Integration/smoke tests for delivery, retry, and audit.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/notification-routing-api.test.ts`
- `npm.cmd run test:smoke:notification-routing`
- `npm.cmd run test:smoke:api-mcp-docs`

### Pass 9 - Client Dashboard Product Completion

Status: Implemented locally on 2026-06-02.

Goal: Turn the client dashboard into the complete product operating cockpit without fake metrics.

Deliverables:

- BYOK/model routing UI.
- MCP/API developer setup UI.
- Runtime governance UI.
- Agent config UI.
- Pack version/rollback UI.
- Dynamic test/calibration UI.
- Notification routing UI.
- Real empty/loading/error/populated/review-required states on every page.

Current evidence:

- `npm.cmd run test:integration -- tests/integration/client-dashboard-surfaces.test.ts`
- `npm.cmd run test:smoke:client-dashboard-surfaces`

### Pass 10 - Production-Like Proof Program

Status: Blocked on external credentials/test tenants. Local smoke and integration coverage exists, but it does not prove production-like provider, IdP, or Stripe operation.

Goal: Close the sell-ready evidence gaps that cannot be proven with local-only simulation.

Deliverables:

- At least one real connector OAuth/sync/backfill proof in a production-like environment.
- Production-like SAML and SCIM lifecycle proof.
- Billing entitlement proof against real Stripe test mode.
- Operations drill evidence.
- Readiness board reaches `go` only with real evidence.

Blocked input likely needed:

- Real test tenant credentials for at least one connector.
- Identity provider test tenant or metadata.
- Stripe test-mode setup.

Exact blocker ledger:

- Connector proof needs one real provider test app and tenant. For Gmail, configure `OPERATORLAYER_OAUTH_STATE_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, authenticated owner/admin access, and a real OAuth callback. Then run the commands in the runbook section "Production-like proof blockers".
- SAML proof needs an IdP test tenant with metadata XML and a real browser login/ACS round trip. Then run the SSO config and SAML smoke commands in the runbook.
- SCIM proof needs `OPERATORLAYER_SCIM_TOKEN` configured in the running app and a SCIM client/test tenant that can create, deactivate, reactivate, group, and reconcile users. Then run the SCIM reconcile command in the runbook.
- Stripe proof needs `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from Stripe test mode plus a signed test event or Stripe CLI forwarding session. Then run the Stripe webhook/reconcile commands in the runbook.

## Verification Rules

Every pass must report:

- files changed,
- PowerShell commands executed,
- passing and failing test summary,
- remaining limitations,
- exact blocker and next command/config when blocked.

The overall goal is complete only when current evidence proves every pass above is complete and the release/readiness surfaces agree.
