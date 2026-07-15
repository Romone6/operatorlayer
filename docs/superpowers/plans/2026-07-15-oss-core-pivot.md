# OperatorLayer OSS Core Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current application into a secure, truthful open-source core for source-backed communication policy review, evaluation, repair, and export.

**Architecture:** Keep the existing Next.js and Supabase application as one deployable unit. Retain only the upload-to-export core, make all derived records source-scoped, and remove product surfaces that claim unsupported sending, commercial billing, identity-provider, or connector capability.

**Tech Stack:** Next.js 16, TypeScript, React, Supabase, Vitest, Playwright, pnpm.

## Global Constraints

- No mocked product records, extracted rules, evaluations, source states, integrations, or exports.
- Deterministic intelligence is test-only; a runtime without a configured model must fail explicitly.
- Never auto-send messages; the OSS core only drafts, evaluates, repairs, reviews, and exports.
- Preserve organisation isolation, source evidence, deletion controls, and least privilege.
- Do not add dependencies when existing platform APIs or installed packages are sufficient.

---

### Task 1: Establish the OSS repository baseline

**Files:**
- Create: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/workflows/ci.yml`
- Modify: `README.md`, `package.json`, `.gitignore`, `.env.example`
- Delete: generated `test-results/*`, `coverage/*`, `tsconfig.tsbuildinfo`

- [ ] Initialise Git in `C:\OperatorLayer\operatorlayer-app`, verify ignored generated output, and create a baseline commit.
- [ ] Set package metadata to the OperatorLayer OSS project and remove the `private` marker.
- [ ] Add a minimal Apache-2.0 license, contributor/security guidance, and CI running `pnpm lint`, `pnpm test:integration`, and `pnpm build`.
- [ ] Replace the marketing-led README with a truthful quickstart, architecture, scope, safety boundary, and verification commands.
- [ ] Verify with `git status --short`, `pnpm lint`, `pnpm test:integration`, and `pnpm build`.

### Task 2: Remove non-core and misleading capability surfaces

**Files:**
- Delete: `app/api/auto-send/**`, `app/api/billing/**`, `app/api/connectors/**`, `app/api/saml/**`, `app/api/scim/**`, `app/api/sso/**`, `app/api/mcp/**`, `app/api/send-events/**`
- Delete: corresponding `lib/enterprise/**`, connector services, enterprise-only tests, operations/procurement documents, and marketing demo/video code
- Modify: `app/app/layout.tsx`, `components/app/app-sidebar.tsx`, `README.md`, `package.json`, `docs/runbook.md`

- [ ] Remove routes and navigation for non-core capabilities instead of leaving feature flags that suggest availability.
- [ ] Remove auto-send worker handling so no code can record a delivery without a real transport.
- [ ] Remove Remotion product theatre and static customer-like dashboard data; retain only explanatory marketing copy clearly labelled as illustrative.
- [ ] Remove now-unused dependencies and scripts.
- [ ] Verify no core source files match `auto-send|billing|connector|saml|scim|mcp|OperantProductDemo` and run the remaining test suite.

### Task 3: Make source processing truthful, source-scoped, and private

**Files:**
- Modify: `lib/intelligence.ts`, `lib/repository/interface.ts`, `lib/repository/memory.ts`, `lib/repository/supabase.ts`, `lib/storage.ts`, `app/api/sources/upload/route.ts`, `lib/services/pipeline.ts`
- Create: `supabase/migrations/0006_source_scoped_derivations.sql`
- Test: `tests/integration/sources-api.test.ts`, `tests/unit/intelligence.test.ts`, `tests/unit/storage.test.ts`

- [ ] Write a regression test proving a second processed source preserves the first source's scenarios and conflicts.
- [ ] Write a runtime test proving missing LLM credentials returns an unavailable error and never creates canned policy/scenario/terminology records.
- [ ] Add `source_id` to scenarios and conflicts, backfill source evidence where possible, and replace only records derived from the processed source.
- [ ] Change storage uploads to private-object paths; do not store a public URL. Validate file byte size, declared source type, and safe filename before buffering or writing.
- [ ] Use the existing `AppError` and repository patterns; make no client-side assumptions about file URLs.
- [ ] Verify targeted tests, `pnpm test:integration`, and the local Supabase smoke when the CLI is available.

### Task 4: Complete the core review and example workflow

**Files:**
- Modify: `lib/types.ts`, `lib/repository/interface.ts`, `lib/repository/memory.ts`, `lib/repository/supabase.ts`, `lib/services/pipeline.ts`, `lib/services/playground.ts`, `app/api/sources/upload/route.ts`
- Create: `app/api/examples/route.ts`, `app/app/examples/page.tsx`
- Modify: `components/app/app-sidebar.tsx`, `app/app/review-queue/page.tsx`, `app/app/exports/page.tsx`
- Test: `tests/integration/examples-api.test.ts`, `tests/integration/versioned-export-packs.test.ts`

- [ ] Add a small first-class example record API for approved and rejected drafts, backed by the existing `examples` table.
- [ ] Require examples to carry source evidence and an explicit approved/rejected classification.
- [ ] Include examples in scenario extraction input and in export pack example artifacts.
- [ ] Block export creation until at least one reviewed policy or example exists; return a clear 409 otherwise.
- [ ] Verify approved/rejected examples appear only in their matching export artifacts and no export is created from an empty, unreviewed organisation.

### Task 5: Harden the core lifecycle and developer contract

**Files:**
- Modify: `app/api/sources/[id]/route.ts`, `lib/repository/interface.ts`, `lib/repository/memory.ts`, `lib/repository/supabase.ts`, `lib/services/jobs.ts`, `app/api/v1/openapi/route.ts`, `sdk/typescript/src/index.ts`
- Modify: `docs/runbook.md`, `docs/developer/api-v1.md`, `README.md`
- Test: `tests/integration/deletion-lifecycle.test.ts`, `tests/integration/api-v1-core.test.ts`

- [ ] Delete source files, chunks, derived records, and examples when a source is deleted.
- [ ] Keep a single-worker queue contract with documented retries; do not introduce a new queue dependency.
- [ ] Trim the OpenAPI document and TypeScript SDK to the retained source, policy, scenario, evaluation, export, and review operations.
- [ ] Document exact local setup, required environment variables, processing failure behaviour, and the no-auto-send boundary.
- [ ] Verify the full retained test suite, build, and a browser smoke of source upload through export.

### Task 6: Publish-ready cleanup and capability ledger

**Files:**
- Create: `docs/CAPABILITIES.md`, `docs/ROADMAP.md`
- Modify: `README.md`, `docs/runbook.md`, `docs/product-vision.md`
- Test: `tests/unit/oss-scope.test.ts`

- [ ] Record each retained capability with its evidence, limits, and validation command.
- [ ] Record removed capabilities and explicit future expansion criteria.
- [ ] Replace stale sell-ready claims with the OSS-core definition of done.
- [ ] Add one scope test preventing auto-send, public source URLs, deterministic runtime intelligence, and enterprise routes from returning unnoticed.
- [ ] Run `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm build`, inspect `git diff --check`, and commit the completed pivot.
