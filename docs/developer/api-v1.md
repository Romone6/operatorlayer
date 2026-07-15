# OperatorLayer REST API v1

## Base path

- Primary versioned namespace: `/api/v1`
- Current endpoints:
  - `GET /api/v1/metadata`
  - `GET /api/v1/openapi`
  - `GET /api/v1/evaluations`
  - `POST /api/v1/runtime/governance`

## Authentication

External API clients must send:

- `x-ol-api-key: <raw_api_key>`
- `x-ol-org-id: <organisation_id>`

API keys are created via internal admin endpoint:

- `POST /api/api-keys`

Organisation LLM provider keys are managed via internal owner/admin endpoints:

- `GET /api/llm/providers`
- `POST /api/llm/providers`
- `POST /api/llm/providers/{id}/revoke`

These endpoints require the `api-admin` capability. Responses only include provider metadata and key previews. Raw keys and encrypted key material must not be returned in API or audit responses.

MCP tools are invoked through:

- `POST /api/mcp`

This endpoint uses external API-key auth and enforces the scope required by each tool.

Runtime governance decisions are invoked through:

- `POST /api/v1/runtime/governance`

This endpoint uses external API-key auth and requires the `runtime.invoke` scope. It evaluates the supplied draft against current organisation policy/scenario records, optionally returns a repaired draft, makes a governance-mode decision, records an audit event, and always returns `audit.sendState = "not_sent"`. It does not send messages or create connector delivery jobs. If a matching persisted agent config exists, the endpoint uses that governance mode, threshold, risk levels, and notification destinations instead of caller-supplied values.

## Scopes

- `evaluation.read` is required for `GET /api/v1/evaluations`.
- `runtime.invoke` is required for `POST /api/v1/runtime/governance`.

If scope is missing, API returns:

- `403` with `error.code = "api_scope_forbidden"`.

## Error envelope

All API errors follow:

```json
{
  "error": {
    "code": "string_code",
    "message": "human readable message",
    "details": {},
    "severity": "low|medium|high|critical",
    "recoverable": true,
    "traceId": "uuid"
  }
}
```

## Example: list evaluations

```bash
curl -sS \
  -H "x-ol-api-key: $OPERATORLAYER_API_KEY" \
  -H "x-ol-org-id: $OPERATORLAYER_ORG_ID" \
  https://<host>/api/v1/evaluations
```

Expected success envelope:

```json
{
  "data": {
    "items": [],
    "credential": {
      "id": "uuid",
      "name": "Enterprise Eval Key"
    }
  }
}
```

## Example: runtime governance

```bash
curl -sS \
  -H "content-type: application/json" \
  -H "x-ol-api-key: $OPERATORLAYER_API_KEY" \
  -H "x-ol-org-id: $OPERATORLAYER_ORG_ID" \
  -d '{
    "agentId": "support-agent",
    "channel": "email",
    "useCase": "pricing_objection",
    "customerSegment": "smb",
    "governanceMode": "conditional_approval",
    "inputMessage": "Can you discount this?",
    "draft": "We can definitely discount this. No risk at all.",
    "notificationDestinations": ["dashboard"]
  }' \
  https://<host>/api/v1/runtime/governance
```

Expected success envelope includes:

```json
{
  "data": {
    "decisionId": "audit-event-id",
    "decision": {
      "mode": "conditional_approval",
      "status": "review_required",
      "allowResponse": false,
      "humanApprovalRequired": true
    },
    "audit": {
      "sendState": "not_sent",
      "autoSendAttempted": false
    }
  }
}
```

## Operational limits (runtime policy)

- Per-key scope checks are enforced at request time.
- Feature and entitlement controls may block downstream actions even when API auth is valid.
- LLM BYOK routing currently supports live OpenAI-compatible requests. Other provider keys can be stored for configuration readiness, but live calls fail with `llm_provider_not_implemented` until the provider adapter is implemented.
- Use `GET /api/enterprise/readiness` and `GET /api/enterprise/readiness-board` for control-plane readiness state.

## Enterprise admin control-plane endpoints

These are internal admin endpoints (owner/admin auth), not public API-key endpoints:

- `GET/PATCH /api/feature-flags`
- `GET /api/feature-flags/matrix`
  - returns governance metadata for each flag:
    - owner
    - blast radius label
    - tenant rollout control field (`rolloutPercent`)
    - effective state for the current organization
- `GET /api/evaluations/{id}/explainability`
  - returns scoring breakdown, violated rules, missing flow steps, risk overrides, evidence references, and repair traceability diff
- `GET/POST/PATCH /api/data-governance/break-glass`
  - owner/admin + `compliance-admin` governed emergency protocol with expiry, release, and immutable audit lifecycle
- `GET/POST /api/data-governance/deletion-requests`
  - lists and creates deletion requests with dependent-artifact snapshots and governance status
- `POST /api/data-governance/deletion-requests/{id}/complete`
  - records approval ticket, execution mode, proof record id, evidence hash, and dependent-artifact handling actions
- `GET/POST/PATCH /api/data-governance/legal-hold`
  - place/release/override lifecycle for legal holds with immutable governance audit events
- `GET/POST /api/agent-configs`
  - lists and upserts per-agent governance mode, channel/use-case/segment scope, score threshold, risk levels, and notification destinations for runtime governance enforcement
