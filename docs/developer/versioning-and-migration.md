# API and MCP Versioning Policy

## Versioning rules

1. Breaking API changes require a new path version (`/api/v{n}`).
2. Existing version remains available during migration window.
3. Non-breaking additive fields may be introduced in current version.
4. Error envelope contract (`code`, `severity`, `recoverable`, `traceId`) is stable across versions.

## Deprecation policy

- Metadata source of truth: `GET /api/v1/metadata`.
- Deprecation policy string is exposed in metadata payload.
- Deprecated endpoints are documented in release notes before removal.

## Migration checklist (consumer side)

1. Read `GET /api/v1/metadata` and confirm target version policy.
2. Fetch `GET /api/v1/openapi` and diff endpoint/field contracts.
3. Validate required API key scopes for target endpoints.
4. Run integration smoke against non-production environment.
5. Roll out by tenant ring with monitoring on error envelope codes.
