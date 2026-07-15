# Better Auth Migration PRD

## Status

Future interest / deferred. Owner direction on 2026-06-06 is to retain Supabase Auth going forward unless stated otherwise.

The current application uses Supabase Auth and Supabase-backed organisation membership checks. Better Auth is not installed in `package.json`, and the current protected app/auth flow imports Supabase clients from `lib/supabase/*`.

## Current Decision

- Retain Supabase Auth through the upload-based MVP.
- Treat Better Auth as post-MVP platform work unless the owner explicitly reopens the migration.
- Do not block product-side completion on Better Auth migration.

## Migration Scope If Reopened

- Add Better Auth server configuration and client helpers.
- Add the required Better Auth schema/migrations.
- Map users, sessions, organisations, roles, and admin capabilities into the existing `RequestContext` contract.
- Replace Supabase sign-in/sign-up UI calls.
- Replace protected app layout session checks.
- Replace invite acceptance authenticated-user lookup.
- Preserve organisation isolation and fail-closed API behavior.
- Preserve `OPERATORLAYER_TEST_AUTH_BYPASS` only for local tests, never production.

## Required Tests

- Unit tests for session/context role and capability mapping.
- Integration tests for sign-up, sign-in, protected app guard, organisation onboarding, invite acceptance, unauthenticated API failure, and cross-organisation denial.
- Smoke or E2E proof for a local authenticated user creating an organisation, uploading a source, and reaching the review/export flow without test-only auth.

## PowerShell Verification Commands

These commands are the minimum verification ladder if a future migration is approved and implemented:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run test:integration -- tests/integration/auth-context.test.ts tests/integration/organisations-api.test.ts tests/integration/member-invites-api.test.ts
npm.cmd run test:e2e
npm.cmd run test
```

If the file names change during a future implementation, the migration pass must update this PRD and `docs/runbook.md` with the exact commands actually run.
