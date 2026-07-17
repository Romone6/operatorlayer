# Operant capability ledger

This is the implementation record for Operant. A capability is listed as implemented only when the code, tests, and documentation agree.

| Capability | State | Evidence and boundary |
| --- | --- | --- |
| Organisation isolation | Implemented | Repositories read and write by `organisation_id`; shipped migrations enable Supabase RLS. |
| Automatic intake | Implemented | Adding pasted text or a supported file queues extraction immediately; deployed workers process queued sources. |
| Policy, terminology, scenario, and conflict extraction | Implemented | Live processing requires `OPENAI_API_KEY`; deterministic fixtures are test-only. |
| Source deletion | Implemented | Removes the object plus source-derived chunks, policies, terminology, scenarios, and conflicts. |
| Human review | Implemented | Policy, terminology, and conflict review routes persist real statuses and audit events. |
| Playground | Implemented | Generates, evaluates, and repairs drafts; it has no message transport. |
| Approved exports | Implemented | Requires an approved policy and emits only the documented core artifacts plus a version manifest. |
| Reviewed examples and feedback | Implemented | Organisation-scoped records persist reviewer rationale and manual or controlled-import feedback. |
| Policy-pack consumption | Implemented | Read-only latest-pack and structural-diff APIs expose real export records. |
| Evaluation scorecard | Implemented | Counts and scores are calculated from persisted evaluations only. |
| Gmail/Slack/CRM connectors | Not implemented | Operant does not connect to communication providers. |
| Auto-send, delivery, and webhooks | Not implemented | Operant has no transport or sending capability. |
| Billing, SSO, SCIM, and MCP | Not implemented | These capabilities are not included in this repository. |
| Per-organisation model credentials | Not implemented | Operant reads a server-managed OpenAI key only. |

## Current strengths

- A coherent evidence → review → draft work → export loop.
- Explicit empty/error states instead of fabricated records.
- Focused tests for extraction boundaries, organisation isolation, deletion, review gates, lifecycle APIs, private storage metadata, and exports.

## Current limitations

- Extraction quality is provider-dependent and needs real-document evaluation sets before quality claims.
- Source evidence for policies and terminology is JSON-backed; cross-source deduplication needs a separate design.
- The lifecycle API is implemented, but its dedicated UI actions and regression-suite runner are not available yet.
- Live Supabase RLS, private storage, migrations, and OpenAI processing still require the staging acceptance test in [DEPLOYMENT.md](DEPLOYMENT.md).
