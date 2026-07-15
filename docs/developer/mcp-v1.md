# OperatorLayer MCP v1

## Discovery and audit endpoints

- `GET /api/mcp/capabilities`
- `POST /api/mcp`
- `GET /api/mcp/audit`

## Capability visibility model

`/api/mcp/capabilities` returns only capabilities that are enabled for the requesting organisation.

Visibility is controlled by:

- feature flags (for example `mcp_actions`)
- organisation isolation from request context

## Capability contract

Each capability item includes:

- `id`
- `title`
- `description`
- `requiredFlag`
- `requiredScope`

## Audit contract

`/api/mcp/audit` returns admin-visible MCP event records:

- `id`
- `action`
- `occurredAt`
- `details`

## Invocation contract

`POST /api/mcp` invokes supported MCP tools through API-key authentication:

- `x-ol-api-key`
- `x-ol-org-id`

Request body:

```json
{
  "toolId": "draft.evaluate",
  "input": {}
}
```

Supported tools:

- `policy_pack.fetch` requires `policy.read`
- `draft.evaluate` requires `evaluation.write`
- `draft.repair` requires `evaluation.write`

Every invocation records an `enterprise:mcp_tool_invocation` audit event with `status: "succeeded"` or `status: "failed"`.

Unavailable or unsafe states fail closed:

- disabled `mcp_actions` flag
- inactive billing entitlement
- missing API/MCP entitlement
- missing tool scope
- missing policy pack export

## Authentication and access

- Request context must be authenticated at organisation scope.
- Tool invocation requires API-key authentication with `x-ol-api-key` and `x-ol-org-id`.
- `GET /api/mcp/audit` requires owner/admin role plus the `api-admin` capability.

## Error model

MCP endpoints use the same standard API error envelope:

- machine-readable `code`
- `severity`
- `recoverable`
- `traceId`
