import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-outage-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "smoke-google-client";
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "smoke-google-secret";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { PATCH: patchFeatureFlags } = await import("@/app/api/feature-flags/route");
  const { POST: createConnector } = await import("@/app/api/connectors/route");
  const { GET: getConnectorHealth } = await import("@/app/api/connectors/[provider]/health/route");
  const { GET: getFailureTaxonomy } = await import("@/app/api/jobs/failure-taxonomy/route");
  const { GET: getReadinessBoard } = await import("@/app/api/enterprise/readiness-board/route");
  const { appendEnterpriseEvent } = await import("@/lib/enterprise/store");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-outage-001" },
      body: JSON.stringify({ name: "Outage Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for outage smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const enableFlagResponse = await patchFeatureFlags(
    authedRequest("http://localhost/api/feature-flags", orgId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "connector_gmail", enabled: true, rolloutPercent: 100 }),
    })
  );
  if (!enableFlagResponse.ok) throw new Error("Failed to enable connector_gmail for outage smoke.");

  const connectorResponse = await createConnector(
    authedRequest("http://localhost/api/connectors", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "gmail",
        displayName: "Gmail Primary",
        scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
        sourceSelection: ["inbox"],
        syncSchedule: "hourly",
        tokenRef: "vault://gmail-token",
      }),
    })
  );
  if (connectorResponse.status !== 201) {
    throw new Error(`Expected connector create 201 but received ${connectorResponse.status}.`);
  }

  const repository = getRepository();
  const failedJob = await repository.enqueueJob({
    organisationId: orgId,
    jobType: "connector_sync",
    payload: { provider: "gmail" },
  });
  await repository.updateJob({
    jobId: failedJob.id,
    organisationId: orgId,
    status: "failed",
    errorMessage: "provider temporarily unavailable",
    payloadPatch: {
      lastErrorCode: "provider_unavailable",
      terminalFailureClass: "provider_unavailable",
    },
  });
  await appendEnterpriseEvent(
    repository,
    { organisationId: orgId, userId: "chaos", role: "admin", email: "chaos@system.local" },
    {
      action: "connector_sync_result",
      payload: {
        provider: "gmail",
        syncStatus: "failed",
        error: "provider_unavailable",
      },
    }
  );

  const taxonomyResponse = await getFailureTaxonomy(
    authedRequest("http://localhost/api/jobs/failure-taxonomy?windowHours=24", orgId)
  );
  if (!taxonomyResponse.ok) throw new Error("Failure taxonomy endpoint failed in outage smoke.");
  const taxonomyPayload = (await taxonomyResponse.json()) as {
    data: { classes: Array<{ class: string }> };
  };
  if (!taxonomyPayload.data.classes.some((item) => item.class === "provider_unavailable")) {
    throw new Error("Provider outage class missing from failure taxonomy.");
  }

  const healthResponse = await getConnectorHealth(authedRequest("http://localhost/api/connectors/gmail/health", orgId), {
    params: Promise.resolve({ provider: "gmail" }),
  });
  if (!healthResponse.ok) throw new Error("Connector health endpoint failed in outage smoke.");
  const healthPayload = (await healthResponse.json()) as {
    data: { health: { failureReasons: string[] } };
  };
  if (!healthPayload.data.health.failureReasons.includes("provider_unavailable")) {
    throw new Error("Connector health failureReasons missing provider_unavailable.");
  }

  const readinessResponse = await getReadinessBoard(
    authedRequest("http://localhost/api/enterprise/readiness-board", orgId)
  );
  if (!readinessResponse.ok) throw new Error("Readiness board endpoint failed in outage smoke.");
  const readinessPayload = (await readinessResponse.json()) as {
    data: { blockers: Array<{ code: string }> };
  };
  if (!readinessPayload.data.blockers.some((item) => item.code === "queue_failed_jobs_present")) {
    throw new Error("Readiness board missing queue_failed_jobs_present during outage simulation.");
  }

  console.log("provider-outage-chaos-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
