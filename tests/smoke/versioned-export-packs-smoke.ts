import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-export-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "export-owner@example.com");
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_INLINE_JOB_RUNNER = process.env.OPERATORLAYER_INLINE_JOB_RUNNER ?? "1";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: uploadSource } = await import("@/app/api/sources/upload/route");
  const { POST: upsertAgentConfig } = await import("@/app/api/agent-configs/route");
  const { POST: createApprovalRule } = await import("@/app/api/approval-rules/route");
  const { POST: createExport } = await import("@/app/api/exports/route");
  const { GET: verifyExport } = await import("@/app/api/exports/[id]/verify/route");
  const { GET: downloadArtifact } = await import("@/app/api/exports/[id]/download/route");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "smoke-export-owner-001",
        "x-user-email": "export-owner@example.com",
      },
      body: JSON.stringify({ name: "Versioned Export Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for versioned export smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const form = new FormData();
  form.set("title", "Versioned Export Policy Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    "Pricing objection scenario. Approved phrase: Based on what you shared, a scoped pilot may fit. Forbidden phrases: no risk at all, guaranteed discount. Human review conditions: discounts, refunds, legal threats, and security claims."
  );
  const source = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  if (!source.ok) throw new Error("Failed to upload export smoke source.");

  const agentConfig = await upsertAgentConfig(
    authedRequest("http://localhost/api/agent-configs", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "sales-agent",
        displayName: "Sales agent",
        channel: "email",
        useCase: "pricing_objection",
        customerSegment: "smb",
        governanceMode: "conditional_approval",
        scoreThreshold: 90,
        riskLevels: ["low"],
        notificationDestinations: ["dashboard"],
        enabled: true,
      }),
    })
  );
  if (!agentConfig.ok) throw new Error("Failed to create export smoke agent config.");

  const approvalRule = await createApprovalRule(
    authedRequest("http://localhost/api/approval-rules", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Low risk pricing review",
        scenario: "pricing_objection",
        minScore: 90,
        riskLevels: ["low"],
        channelAllowlist: ["email"],
        customerTypeAllowlist: ["smb"],
        requiresHumanApproval: false,
        enabled: true,
      }),
    })
  );
  if (!approvalRule.ok) throw new Error("Failed to create export smoke approval rule.");

  const firstExport = await createExport(
    authedRequest("http://localhost/api/exports", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportType: "full_pack" }),
    })
  );
  if (!firstExport.ok) throw new Error("Failed to create first export pack.");
  const firstPayload = (await firstExport.json()) as {
    data: { id: string; manifest: { version: number; checksum: string; previousExportId: string | null }; artifacts: Array<{ name: string }> };
  };
  if (firstPayload.data.manifest.version !== 1) throw new Error("First export version should be 1.");
  if (firstPayload.data.manifest.previousExportId !== null) {
    throw new Error("First export should not have a previous export pointer.");
  }

  const secondExport = await createExport(
    authedRequest("http://localhost/api/exports", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportType: "full_pack" }),
    })
  );
  if (!secondExport.ok) throw new Error("Failed to create second export pack.");
  const secondPayload = (await secondExport.json()) as {
    data: {
      id: string;
      manifest: {
        version: number;
        previousExportId: string | null;
        rollbackPointer?: { previousExportId: string | null; previousChecksum: string | null };
      };
      artifacts: Array<{ name: string; checksum: string }>;
    };
  };

  const requiredArtifacts = [
    "company_voice.md",
    "communication_policy.json",
    "scenario_playbooks.json",
    "phrase_library.json",
    "forbidden_phrases.json",
    "approval_rules.json",
    "evaluation_rubric.json",
    "approved_examples.jsonl",
    "rejected_examples.jsonl",
    "agent_prompt_pack.md",
    "company_identity.json",
    "knowledge_pack.json",
    "sales_positioning_pack.json",
    "support_resolution_pack.json",
    "escalation_hierarchy.json",
    "agent_permissions.json",
    "runtime_governance_policy.json",
    "test_suite_manifest.json",
    "agent_alignment_report.json",
    "policy_version_manifest.json",
  ];
  const artifactNames = secondPayload.data.artifacts.map((artifact) => artifact.name);
  for (const artifactName of requiredArtifacts) {
    if (!artifactNames.includes(artifactName)) {
      throw new Error(`Missing required export artifact: ${artifactName}`);
    }
  }
  if (secondPayload.data.manifest.version !== 2) throw new Error("Second export version should be 2.");
  if (secondPayload.data.manifest.previousExportId !== firstPayload.data.id) {
    throw new Error("Second export did not point to first export.");
  }
  if (secondPayload.data.manifest.rollbackPointer?.previousChecksum !== firstPayload.data.manifest.checksum) {
    throw new Error("Second export rollback checksum did not match first export.");
  }

  const verify = await verifyExport(
    authedRequest(`http://localhost/api/exports/${secondPayload.data.id}/verify`, orgId),
    { params: Promise.resolve({ id: secondPayload.data.id }) }
  );
  if (!verify.ok) throw new Error("Failed to verify versioned export pack.");
  const verifyPayload = (await verify.json()) as {
    data: {
      manifest: {
        version: number;
        artifactCountValid: boolean;
        artifactNamesValid: boolean;
        checksumValid: boolean;
        signatureValid: boolean;
        previousExportId: string | null;
      };
      artifactChecks: Array<{ valid: boolean }>;
    };
  };
  if (
    verifyPayload.data.manifest.version !== 2 ||
    !verifyPayload.data.manifest.artifactCountValid ||
    !verifyPayload.data.manifest.artifactNamesValid ||
    !verifyPayload.data.manifest.checksumValid ||
    !verifyPayload.data.manifest.signatureValid ||
    verifyPayload.data.manifest.previousExportId !== firstPayload.data.id ||
    !verifyPayload.data.artifactChecks.every((check) => check.valid)
  ) {
    throw new Error("Versioned export verification failed.");
  }

  const download = await downloadArtifact(
    authedRequest(
      `http://localhost/api/exports/${secondPayload.data.id}/download?name=policy_version_manifest.json`,
      orgId
    ),
    { params: Promise.resolve({ id: secondPayload.data.id }) }
  );
  if (!download.ok) throw new Error("Failed to download policy_version_manifest.json.");
  const downloadedManifest = JSON.parse(await download.text()) as {
    pack_version: number;
    previous_export_id: string | null;
    artifact_manifest: Array<{ name: string }>;
  };
  if (downloadedManifest.pack_version !== 2 || downloadedManifest.previous_export_id !== firstPayload.data.id) {
    throw new Error("Downloaded policy_version_manifest.json did not preserve version or rollback pointer.");
  }
  if (!downloadedManifest.artifact_manifest.some((artifact) => artifact.name === "agent_permissions.json")) {
    throw new Error("Policy version manifest did not list agent_permissions.json.");
  }

  const permissions = await downloadArtifact(
    authedRequest(
      `http://localhost/api/exports/${secondPayload.data.id}/download?name=agent_permissions.json`,
      orgId
    ),
    { params: Promise.resolve({ id: secondPayload.data.id }) }
  );
  if (!permissions.ok) throw new Error("Failed to download agent_permissions.json.");
  const downloadedPermissions = JSON.parse(await permissions.text()) as {
    agents: Array<{ agent_id: string; runtime_autonomy: string; can_auto_send: boolean }>;
    default_policy: { can_auto_send: boolean; requires_runtime_governance: boolean };
  };
  const agentPermission = downloadedPermissions.agents.find((agent) => agent.agent_id === "sales-agent");
  if (!agentPermission || agentPermission.runtime_autonomy !== "conditional_approval" || agentPermission.can_auto_send) {
    throw new Error("agent_permissions.json did not preserve governed no-auto-send agent permissions.");
  }
  if (downloadedPermissions.default_policy.can_auto_send || !downloadedPermissions.default_policy.requires_runtime_governance) {
    throw new Error("agent_permissions.json default policy must require runtime governance and forbid auto-send.");
  }

  console.log("versioned-export-packs-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
