# Security Questionnaire Baseline

## Data Handling

- Customer data is tenant-scoped and access-controlled.
- No hidden cross-tenant training on customer data by default.
- Deletion workflows include request, approval, and completion states.

## Identity and Access

- Role-based access across owner/admin/reviewer/analyst/member.
- SAML login and ACS endpoints supported.
- SCIM provisioning endpoints available for user/group lifecycle flows.

## Audit and Governance

- Audit event APIs expose filtered, paginated event streams.
- Approval and send decisions retain policy/evidence linkage.
- Legal hold blocks deletion completion when enabled.

## Secrets and Transport

- Secrets are environment-based and never committed.
- Error responses emit trace IDs for incident correlation.
- Webhook delivery supports signing and replay workflows.

## Availability and Operations

- Readiness, status, and readiness-board surfaces available for go/no-go checks.
- Queue replay path exists for failed/dead-letter jobs.
- Incident severity mapping and operational runbooks are documented.
