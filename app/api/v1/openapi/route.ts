import { jsonOk } from "@/lib/http";

const paths = {
  "/api/v1/evaluations": {
    get: {
      summary: "List evaluations for organisation",
    },
  },
  "/api/v1/metadata": {
    get: {
      summary: "API version metadata",
    },
  },
  "/api/v1/runtime/governance": {
    post: {
      summary:
        "Run fast runtime governance for a connected agent with policy-pack reference, evaluation, repair suggestion, approval decision, notification intent, and audit logging",
    },
  },
  "/api/send-events/{id}": {
    get: {
      summary: "Get send event details",
    },
  },
  "/api/send-events": {
    get: {
      summary:
        "List send events with immutable decision snapshot, reviewer/risk state, connector target, and delivery confirmation state",
    },
  },
  "/api/saml/metadata": {
    get: {
      summary: "Get SAML service provider metadata",
    },
  },
  "/api/audit/events": {
    get: {
      summary: "List immutable enterprise audit events with scoped filtering",
    },
  },
  "/api/connectors/{provider}/health": {
    get: {
      summary: "Get provider connector health state",
    },
  },
  "/api/connectors/{provider}/backfill": {
    post: {
      summary: "Queue provider backfill run",
    },
  },
  "/api/connectors/{provider}/sync-runs": {
    get: {
      summary: "List provider connector sync run history",
    },
  },
  "/api/approval-policies": {
    get: {
      summary: "List approval policies",
    },
    post: {
      summary: "Create approval policy",
    },
  },
  "/api/approval-policies/{id}": {
    patch: {
      summary: "Update approval policy",
    },
  },
  "/api/agent-configs": {
    get: {
      summary: "List persisted agent governance configs",
    },
    post: {
      summary: "Create or update an agent governance config used by runtime decisions",
    },
  },
  "/api/test-suites": {
    get: {
      summary: "List generated dynamic test suites built from real organisation policies, scenarios, evaluations, and audit failures",
    },
    post: {
      summary: "Generate a dynamic test suite from real organisation policies, scenarios, evaluations, and audit failures",
    },
  },
  "/api/test-suites/{id}/run": {
    post: {
      summary: "Run a generated dynamic test suite through the evaluator and persist an auditable test run record",
    },
  },
  "/api/calibration/recommendations": {
    get: {
      summary: "List calibration recommendations created by dynamic test run failures",
    },
  },
  "/api/calibration/recommendations/{id}": {
    patch: {
      summary: "Approve or reject a calibration recommendation without auto-applying policy changes",
    },
  },
  "/api/notifications/destinations": {
    get: {
      summary: "List notification destination availability, including real webhook routing and unavailable provider labels",
    },
  },
  "/api/billing/entitlements/effective": {
    get: {
      summary: "Get effective billing entitlement state",
    },
  },
  "/api/mcp": {
    post: {
      summary: "Invoke an MCP tool with API-key auth, org scoping, feature/entitlement checks, scope enforcement, and audit logging",
    },
  },
  "/api/llm/providers": {
    get: {
      summary: "List organisation LLM provider key configurations without exposing stored secrets",
    },
    post: {
      summary: "Create an encrypted organisation LLM provider key for BYOK routing",
    },
  },
  "/api/llm/providers/{id}/revoke": {
    post: {
      summary: "Revoke an organisation LLM provider key",
    },
  },
  "/api/mcp/audit": {
    get: {
      summary: "List MCP invocation audit records",
    },
  },
  "/api/webhooks/{id}/replay": {
    get: { summary: "List replayable webhook deliveries" },
    post: { summary: "Replay webhook delivery" },
  },
  "/api/connectors/catalog": {
    get: {
      summary: "List connector availability states and unavailability reasons by provider",
    },
  },
  "/api/enterprise/readiness-board": {
    get: {
      summary: "Enterprise release decision board with go/no-go, blockers, queue health, and SLOs",
    },
  },
  "/api/enterprise/onboarding-checklist": {
    get: {
      summary: "Enterprise onboarding checklist with completion meter and actionable blocker commands",
    },
  },
  "/api/enterprise/release-decision": {
    get: {
      summary:
        "Single integrated enterprise release decision artifact with go/no-go summary, readiness board, checklist, capability status, runtime evidence signals, compliance posture (no certification claim), requirement-level closure audit, and 10-domain closure assessments",
    },
  },
  "/api/scim/v2/reconcile": {
    post: {
      summary: "Run SCIM drift reconciliation and optionally apply remediations",
    },
  },
  "/api/data-governance/policies/simulate": {
    post: {
      summary: "Simulate governance policy impact before apply (retention/legal-hold/deletion controls)",
    },
  },
  "/api/data-governance/deletion-requests": {
    get: {
      summary: "List deletion requests with approval/completion proof and dependent-artifact handling state",
    },
    post: {
      summary: "Create deletion request with dependent-artifact snapshot",
    },
  },
  "/api/data-governance/deletion-requests/{id}/complete": {
    post: {
      summary:
        "Approve and complete deletion request with proof record, evidence hash, and dependent-artifact handling entries",
    },
  },
  "/api/data-governance/legal-hold": {
    get: {
      summary: "Get legal-hold lifecycle state and history",
    },
    post: {
      summary: "Place legal hold with scope, reason, ticket, and optional expiry",
    },
    patch: {
      summary: "Release or override active legal hold with immutable audit evidence",
    },
  },
  "/api/data-governance/break-glass": {
    get: {
      summary: "Get break-glass governance protocol state and invocation history",
    },
    post: {
      summary: "Invoke break-glass governance protocol with expiry and audit evidence",
    },
    patch: {
      summary: "Release active break-glass invocation",
    },
  },
  "/api/evaluations/{id}/explainability": {
    get: {
      summary: "Get explainability pack for an evaluation run with scoring, violations, and repair traceability",
    },
  },
};

const components = {
  schemas: {
    ApiErrorEnvelope: {
      type: "object",
      required: ["error"],
      properties: {
        error: {
          type: "object",
          required: ["code", "message", "severity", "recoverable", "traceId"],
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            details: {},
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            recoverable: { type: "boolean" },
            traceId: { type: "string" },
          },
        },
      },
    },
    ReviewItem: {
      oneOf: [
        {
          type: "object",
          required: ["kind", "entityType", "severity", "confidence"],
          properties: {
            kind: { const: "policy" },
            entityType: { const: "policy" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            confidence: { type: "number" },
          },
        },
        {
          type: "object",
          required: ["kind", "entityType", "confidence"],
          properties: {
            kind: { const: "terminology" },
            entityType: { const: "terminology" },
            confidence: { type: "number" },
          },
        },
        {
          type: "object",
          required: ["kind", "entityType", "severity"],
          properties: {
            kind: { const: "conflict" },
            entityType: { const: "conflict" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          },
        },
      ],
    },
    ApprovalDecision: {
      oneOf: [
        {
          type: "object",
          required: ["status", "reason", "matchedRuleId", "approvalRequired"],
          properties: {
            status: { const: "approved" },
            reason: { type: "string" },
            matchedRuleId: { type: "string" },
            approvalRequired: { const: false },
          },
        },
        {
          type: "object",
          required: ["status", "reason", "matchedRuleId", "approvalRequired"],
          properties: {
            status: { const: "review_required" },
            reason: { type: "string" },
            matchedRuleId: { type: ["string", "null"] },
            approvalRequired: { const: true },
          },
        },
      ],
    },
    SendDecision: {
      oneOf: [
        {
          type: "object",
          required: ["allowed", "state", "reason", "matchedRuleId", "approvalRequired", "approvalDecision"],
          properties: {
            allowed: { const: true },
            state: { const: "allowed" },
            reason: { type: "string" },
            matchedRuleId: { type: "string" },
            approvalRequired: { const: false },
            approvalDecision: { $ref: "#/components/schemas/ApprovalDecision" },
          },
        },
        {
          type: "object",
          required: ["allowed", "state", "reason", "matchedRuleId", "approvalRequired", "approvalDecision"],
          properties: {
            allowed: { const: false },
            state: { const: "blocked" },
            reason: { type: "string" },
            matchedRuleId: { type: ["string", "null"] },
            approvalRequired: { const: true },
            approvalDecision: { $ref: "#/components/schemas/ApprovalDecision" },
          },
        },
      ],
    },
    ConnectorSyncState: {
      oneOf: [
        {
          type: "object",
          required: ["state", "connected", "connectionHealth", "provider", "featureEnabled", "sync", "health"],
          properties: {
            state: { const: "connected" },
            connected: { const: true },
            connectionHealth: { enum: ["healthy", "degraded"] },
            provider: { type: "string" },
            featureEnabled: { type: "boolean" },
            sync: { type: "object" },
            health: { type: "object" },
          },
        },
        {
          type: "object",
          required: ["state", "connected", "connectionHealth", "provider", "featureEnabled", "sync", "health"],
          properties: {
            state: { const: "disconnected" },
            connected: { const: false },
            connectionHealth: { const: "offline" },
            provider: { type: "string" },
            featureEnabled: { type: "boolean" },
            sync: { type: "object" },
            health: { type: "object" },
          },
        },
      ],
    },
    BillingEntitlementState: {
      oneOf: [
        {
          type: "object",
          required: ["state", "status", "enforcement", "organisationId", "plan", "updatedAt"],
          properties: {
            state: { const: "active" },
            status: { const: "active" },
            enforcement: { const: "granted" },
            organisationId: { type: "string" },
            plan: { type: "string", enum: ["starter", "growth", "enterprise"] },
            updatedAt: { type: "string" },
          },
        },
        {
          type: "object",
          required: ["state", "status", "enforcement", "organisationId", "plan", "updatedAt"],
          properties: {
            state: { const: "past_due" },
            status: { const: "past_due" },
            enforcement: { const: "payment_required" },
            organisationId: { type: "string" },
            plan: { type: "string", enum: ["starter", "growth", "enterprise"] },
            updatedAt: { type: "string" },
          },
        },
        {
          type: "object",
          required: ["state", "status", "enforcement", "organisationId", "plan", "updatedAt"],
          properties: {
            state: { const: "suspended" },
            status: { const: "suspended" },
            enforcement: { const: "suspended" },
            organisationId: { type: "string" },
            plan: { type: "string", enum: ["starter", "growth", "enterprise"] },
            updatedAt: { type: "string" },
          },
        },
      ],
    },
    ReadinessBlocker: {
      oneOf: [
        {
          type: "object",
          required: ["category", "code", "message", "severity", "recoverable"],
          properties: {
            category: { const: "configuration" },
            code: { type: "string" },
            message: { type: "string" },
            severity: { type: "string", enum: ["high", "critical"] },
            recoverable: { type: "boolean" },
          },
        },
        {
          type: "object",
          required: ["category", "code", "message", "severity", "recoverable"],
          properties: {
            category: { enum: ["identity", "billing", "feature_flag", "connector"] },
            code: { type: "string" },
            message: { type: "string" },
            severity: { type: "string", enum: ["high", "critical"] },
            recoverable: { type: "boolean" },
          },
        },
      ],
    },
    AuditEvent: {
      oneOf: [
        {
          type: "object",
          required: ["category", "action", "severity", "recoverable", "occurredAt", "metadata"],
          properties: {
            category: {
              enum: ["ingestion", "review", "enterprise", "connector", "billing", "security", "governance"],
            },
            action: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            recoverable: { type: "boolean" },
            occurredAt: { type: "string" },
            metadata: { type: "object" },
          },
        },
      ],
    },
  },
};

export async function GET() {
  return jsonOk({
    openapi: "3.1.0",
    info: {
      title: "OperatorLayer API",
      version: "v1",
      description: "OperatorLayer enterprise API surface.",
    },
    paths,
    components,
  });
}
