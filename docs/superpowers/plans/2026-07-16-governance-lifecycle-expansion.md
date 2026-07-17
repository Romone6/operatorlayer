# Governance lifecycle status

## Goal

Add a small, organisation-scoped governance lifecycle without adding outbound delivery or live connectors.

## Released in the public core

- [x] `ReviewedExample` and `FeedbackRecord` types, repository persistence, Supabase migration `0007_governance_lifecycle.sql`, indexes, and RLS.
- [x] Role-protected create/list APIs for reviewed examples and feedback.
- [x] Controlled feedback JSON import: validated, bounded to 100 records, organisation-scoped, and role-protected.
- [x] Read-only latest policy-pack and structural version-diff endpoints.
- [x] Scorecard calculated from persisted evaluations only.
- [x] Focused integration coverage for lifecycle APIs and export/review flow.

## Explicitly deferred

- [ ] UI controls for promoting evaluations to reviewed examples and submitting feedback.
- [ ] Regression-suite creation and execution from human-approved examples.
- [ ] Scorecard presentation in the Overview UI.

The deferred items are not public-core capabilities. They need their own test-first proposal and must preserve the no-send, no-fabrication, and organisation-isolation rules.
