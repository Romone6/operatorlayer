import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as upsertAgentConfig } from "@/app/api/agent-configs/route";
import { POST as createApprovalRule } from "@/app/api/approval-rules/route";
import { GET as downloadArtifact } from "@/app/api/exports/[id]/download/route";
import { GET as verifyExport } from "@/app/api/exports/[id]/verify/route";
import { POST as createExport } from "@/app/api/exports/route";
import { POST as createOrganisation } from "@/app/api/organisations/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

const REQUIRED_ARTIFACTS = [
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

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "export-owner-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", "owner");
  headers.set("x-user-email", "export-owner@example.com");
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const response = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "export-owner-001",
        "x-user-email": "export-owner@example.com",
      },
      body: JSON.stringify({ name: "Versioned Export Org", industry: "SaaS" }),
    })
  );
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

async function uploadPolicySource(orgId: string) {
  const form = new FormData();
  form.set("title", "Versioned Export Policy Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    [
      "Pricing objection scenario. Required behaviour: acknowledge concern and provide a governed next step.",
      "Approved phrase: Based on what you shared, a scoped pilot may fit.",
      "Forbidden phrases: no risk at all, guaranteed discount.",
      "Human review conditions: discounts, legal threats, and security claims.",
    ].join(" ")
  );
  const response = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  expect(response.status).toBe(201);
}

async function configureGovernance(orgId: string) {
  const agentConfig = await upsertAgentConfig(
    authedRequest("http://localhost/api/agent-configs", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "support-agent",
        displayName: "Support agent",
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
  expect(agentConfig.status).toBe(201);

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
        requiresHumanApproval: true,
        enabled: true,
      }),
    })
  );
  expect(approvalRule.status).toBe(201);
}

async function generateExport(orgId: string) {
  const response = await createExport(
    authedRequest("http://localhost/api/exports", orgId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportType: "full_pack" }),
    })
  );
  expect(response.status).toBe(201);
  return (await response.json()) as {
    data: {
      id: string;
      manifest: {
        version: number;
        checksum: string;
        previousExportId: string | null;
        rollbackPointer?: { previousExportId: string | null; previousChecksum: string | null };
      };
      artifacts: Array<{ name: string; checksum: string }>;
    };
  };
}

describe("versioned export packs", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPERATORLAYER_DATA_BACKEND = "memory";
    process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "1";
    process.env.OPERATORLAYER_PROCESSING_MODE = "deterministic";
    delete process.env.OPENAI_API_KEY;
  });

  it("generates agent-ready versioned packs with rollback metadata and verified downloads", async () => {
    const orgId = await createOrg();
    await uploadPolicySource(orgId);
    await configureGovernance(orgId);

    const first = await generateExport(orgId);
    expect(first.data.manifest.version).toBe(1);
    expect(first.data.manifest.previousExportId).toBeNull();

    const second = await generateExport(orgId);
    expect(second.data.manifest.version).toBe(2);
    expect(second.data.manifest.previousExportId).toBe(first.data.id);
    expect(second.data.manifest.rollbackPointer?.previousExportId).toBe(first.data.id);
    expect(second.data.manifest.rollbackPointer?.previousChecksum).toBe(first.data.manifest.checksum);
    expect(second.data.artifacts.map((artifact) => artifact.name).sort()).toEqual([...REQUIRED_ARTIFACTS].sort());

    const verify = await verifyExport(
      authedRequest(`http://localhost/api/exports/${second.data.id}/verify`, orgId),
      { params: Promise.resolve({ id: second.data.id }) }
    );
    expect(verify.status).toBe(200);
    const verifyPayload = (await verify.json()) as {
      data: {
        manifest: {
          version: number;
          previousExportId: string | null;
          artifactCountValid: boolean;
          artifactNamesValid: boolean;
          checksumValid: boolean;
          signatureValid: boolean;
        };
        artifactChecks: Array<{ valid: boolean }>;
      };
    };
    expect(verifyPayload.data.manifest.version).toBe(2);
    expect(verifyPayload.data.manifest.previousExportId).toBe(first.data.id);
    expect(verifyPayload.data.manifest.artifactCountValid).toBe(true);
    expect(verifyPayload.data.manifest.artifactNamesValid).toBe(true);
    expect(verifyPayload.data.manifest.checksumValid).toBe(true);
    expect(verifyPayload.data.manifest.signatureValid).toBe(true);
    expect(verifyPayload.data.artifactChecks.every((check) => check.valid)).toBe(true);

    const manifestDownload = await downloadArtifact(
      authedRequest(
        `http://localhost/api/exports/${second.data.id}/download?name=policy_version_manifest.json`,
        orgId
      ),
      { params: Promise.resolve({ id: second.data.id }) }
    );
    expect(manifestDownload.status).toBe(200);
    const downloadedManifest = JSON.parse(await manifestDownload.text()) as {
      pack_version: number;
      previous_export_id: string | null;
      rollback: { previous_export_id: string | null; previous_checksum: string | null };
      artifact_manifest: Array<{ name: string }>;
    };
    expect(downloadedManifest.pack_version).toBe(2);
    expect(downloadedManifest.previous_export_id).toBe(first.data.id);
    expect(downloadedManifest.rollback.previous_export_id).toBe(first.data.id);
    expect(downloadedManifest.rollback.previous_checksum).toBe(first.data.manifest.checksum);
    expect(downloadedManifest.artifact_manifest.some((artifact) => artifact.name === "agent_permissions.json")).toBe(
      true
    );
    expect(
      downloadedManifest.artifact_manifest.some((artifact) => artifact.name === "runtime_governance_policy.json")
    ).toBe(true);

    const permissionsArtifact = second.data.artifacts.find((artifact) => artifact.name === "agent_permissions.json");
    expect(permissionsArtifact).toBeTruthy();
    const permissionsDownload = await downloadArtifact(
      authedRequest(`http://localhost/api/exports/${second.data.id}/download?name=agent_permissions.json`, orgId),
      { params: Promise.resolve({ id: second.data.id }) }
    );
    expect(permissionsDownload.status).toBe(200);
    expect(permissionsDownload.headers.get("X-Checksum-Sha256")).toBe(permissionsArtifact?.checksum);
    const permissions = JSON.parse(await permissionsDownload.text()) as {
      agents: Array<{ agent_id: string; runtime_autonomy: string; can_auto_send: boolean }>;
      default_policy: { can_auto_send: boolean; requires_runtime_governance: boolean };
    };
    expect(permissions.agents[0]).toMatchObject({
      agent_id: "support-agent",
      runtime_autonomy: "conditional_approval",
      can_auto_send: false,
    });
    expect(permissions.default_policy).toEqual({
      can_auto_send: false,
      requires_runtime_governance: true,
    });
  });
});
