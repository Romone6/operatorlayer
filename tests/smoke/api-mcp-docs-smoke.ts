import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-docs-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function requireFile(relativePath: string) {
  const absolutePath = join(process.cwd(), relativePath);
  await access(absolutePath, fsConstants.F_OK);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { GET: getOpenApi } = await import("@/app/api/v1/openapi/route");
  const { GET: getMetadata } = await import("@/app/api/v1/metadata/route");
  const { GET: getMcpCapabilities } = await import("@/app/api/mcp/capabilities/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-docs-001" },
      body: JSON.stringify({ name: "Docs Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for docs smoke.");
  const org = (await create.json()) as { data: { id: string } };

  const openApiResponse = await getOpenApi();
  if (!openApiResponse.ok) throw new Error("OpenAPI endpoint failed.");
  const openApiPayload = (await openApiResponse.json()) as {
    data: {
      openapi: string;
      paths: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    };
  };
  if (openApiPayload.data.openapi !== "3.1.0") throw new Error("OpenAPI version mismatch.");
  if (!openApiPayload.data.paths["/api/v1/evaluations"]) throw new Error("Missing /api/v1/evaluations in OpenAPI.");
  if (!openApiPayload.data.paths["/api/v1/runtime/governance"]) {
    throw new Error("Missing /api/v1/runtime/governance in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/scim/v2/reconcile"]) {
    throw new Error("Missing /api/scim/v2/reconcile in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/data-governance/policies/simulate"]) {
    throw new Error("Missing /api/data-governance/policies/simulate in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/data-governance/break-glass"]) {
    throw new Error("Missing /api/data-governance/break-glass in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/data-governance/deletion-requests"]) {
    throw new Error("Missing /api/data-governance/deletion-requests in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/data-governance/deletion-requests/{id}/complete"]) {
    throw new Error("Missing /api/data-governance/deletion-requests/{id}/complete in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/data-governance/legal-hold"]) {
    throw new Error("Missing /api/data-governance/legal-hold in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/evaluations/{id}/explainability"]) {
    throw new Error("Missing /api/evaluations/{id}/explainability in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/audit/events"]) {
    throw new Error("Missing /api/audit/events in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/saml/metadata"]) {
    throw new Error("Missing /api/saml/metadata in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/connectors/{provider}/health"]) {
    throw new Error("Missing /api/connectors/{provider}/health in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/connectors/{provider}/backfill"]) {
    throw new Error("Missing /api/connectors/{provider}/backfill in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/connectors/{provider}/sync-runs"]) {
    throw new Error("Missing /api/connectors/{provider}/sync-runs in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/approval-policies"]) {
    throw new Error("Missing /api/approval-policies in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/approval-policies/{id}"]) {
    throw new Error("Missing /api/approval-policies/{id} in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/agent-configs"]) {
    throw new Error("Missing /api/agent-configs in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/test-suites"]) {
    throw new Error("Missing /api/test-suites in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/test-suites/{id}/run"]) {
    throw new Error("Missing /api/test-suites/{id}/run in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/calibration/recommendations"]) {
    throw new Error("Missing /api/calibration/recommendations in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/calibration/recommendations/{id}"]) {
    throw new Error("Missing /api/calibration/recommendations/{id} in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/notifications/destinations"]) {
    throw new Error("Missing /api/notifications/destinations in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/billing/entitlements/effective"]) {
    throw new Error("Missing /api/billing/entitlements/effective in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/mcp/audit"]) {
    throw new Error("Missing /api/mcp/audit in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/mcp"]) {
    throw new Error("Missing /api/mcp in OpenAPI.");
  }
  if (!openApiPayload.data.paths["/api/enterprise/release-decision"]) {
    throw new Error("Missing /api/enterprise/release-decision in OpenAPI.");
  }

  const schemas = openApiPayload.data.components?.schemas ?? {};
  for (const schemaName of [
    "ApiErrorEnvelope",
    "ReviewItem",
    "ApprovalDecision",
    "SendDecision",
    "ConnectorSyncState",
    "BillingEntitlementState",
    "ReadinessBlocker",
    "AuditEvent",
  ]) {
    if (!schemas[schemaName]) {
      throw new Error(`Missing components.schemas.${schemaName} in OpenAPI.`);
    }
  }

  const metadataResponse = await getMetadata(new NextRequest("http://localhost/api/v1/metadata"));
  if (!metadataResponse.ok) throw new Error("Metadata endpoint failed.");
  const metadataPayload = (await metadataResponse.json()) as {
    data: { version: string; deprecationPolicy: string };
  };
  if (metadataPayload.data.version !== "v1") throw new Error("Metadata version mismatch.");
  if (!metadataPayload.data.deprecationPolicy) throw new Error("Metadata deprecation policy missing.");

  const mcpCapabilitiesResponse = await getMcpCapabilities(
    authedRequest("http://localhost/api/mcp/capabilities", org.data.id)
  );
  if (!mcpCapabilitiesResponse.ok) throw new Error("MCP capabilities endpoint failed.");
  const mcpPayload = (await mcpCapabilitiesResponse.json()) as {
    data: { capabilities: Array<{ id: string; title: string }> };
  };
  if (!Array.isArray(mcpPayload.data.capabilities)) throw new Error("MCP capabilities payload invalid.");

  await Promise.all([
    requireFile("docs/developer/api-v1.md"),
    requireFile("docs/developer/mcp-v1.md"),
    requireFile("docs/developer/versioning-and-migration.md"),
  ]);

  console.log("api-mcp-docs-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
