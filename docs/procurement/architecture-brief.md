# Architecture Brief (Baseline)

OperatorLayer is a multi-tenant control plane for communication policy, evaluation, and repair workflows.

## Core Properties

- Tenant isolation at organisation/workspace boundary.
- Permissioned ingestion and evidence-anchored outputs.
- Human-governed approvals for high-risk workflows.
- Runtime kill switches and feature-flag gating for unsafe capabilities.

## Deployment Posture

- SaaS multi-tenant runtime.
- BYOC options for keys/storage/connector credentials segregation.
- No hidden training on customer data by default.

## Current Enterprise Surface

- IAM: SAML + SCIM routes, role-based access controls.
- Governance: audit events, retention/legal hold controls, review workflows.
- Integration: connector lifecycle routes, API keys, webhooks, MCP audit/capabilities.

## Control Notes

- SOC2-ready posture here means controls/process/evidence implementation,
  not a certification claim.
