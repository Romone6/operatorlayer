import assert from "node:assert/strict";
import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as listMembers } from "@/app/api/members/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { GET as getSourceGovernance } from "@/app/api/source-governance/route";
import { GET as getReviewQueue } from "@/app/api/review-queue/route";
import { POST as reviewAction } from "@/app/api/review-queue/actions/route";
import { GET as getReviewEvents } from "@/app/api/review-events/route";
import { POST as createExport } from "@/app/api/exports/route";
import { GET as verifyExport } from "@/app/api/exports/[id]/verify/route";

function authedRequest(url: string, orgId: string, userId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", userId);
  headers.set("x-org-id", orgId);
  return new NextRequest(url, {
    method: init.method,
    headers,
    body: init.body ?? undefined,
  });
}

async function main() {
  console.log("[smoke] phase2 supabase-backed run started");
  const userId = crypto.randomUUID();

  const createOrgReq = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-org-id": crypto.randomUUID(),
    },
    body: JSON.stringify({ name: "Smoke Org", industry: "Technology" }),
  });

  const createOrgRes = await createOrganisation(createOrgReq);
  assert.equal(createOrgRes.status, 201, "create organisation should return 201");
  const createOrgPayload = (await createOrgRes.json()) as { data: { id: string } };
  const orgId = createOrgPayload.data.id;
  assert.ok(orgId, "organisation id should exist");

  const settingsBeforeRes = await getSettings(authedRequest("http://localhost/api/settings", orgId, userId));
  assert.equal(settingsBeforeRes.status, 200, "settings GET should return 200");

  const membersRes = await listMembers(authedRequest("http://localhost/api/members", orgId, userId));
  assert.equal(membersRes.status, 200, "members GET should return 200 for owner");
  const membersPayload = (await membersRes.json()) as { data: Array<{ id: string; role: string }> };
  assert.equal(membersPayload.data.length > 0, true, "members list should contain at least one user");
  assert.equal(membersPayload.data[0].role, "owner", "seeded creator role should be owner");

  const membersDenied = await listMembers(
    authedRequest("http://localhost/api/members", orgId, userId, {
      headers: { "x-user-role": "member" },
    })
  );
  assert.equal(membersDenied.status, 403, "members GET should return 403 for member role");

  const settingsPatchRes = await patchSettings(
    authedRequest("http://localhost/api/settings", orgId, userId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organisation: {
          name: "Smoke Org Updated",
          riskTolerance: "high",
          autoSendAllowed: false,
        },
        controls: {
          defaultTone: "consultative",
          pricingApprovalThreshold: 15,
          refundApprovalThreshold: 800,
          dataRetentionDays: 365,
          modelProvider: "openai",
        },
      }),
    })
  );
  assert.equal(settingsPatchRes.status, 200, "settings PATCH should return 200");

  const form = new FormData();
  form.set("title", "Smoke Source");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set(
    "pastedText",
    "The price is too high. Based on what you shared, a scoped pilot may make more sense."
  );

  const uploadRes = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, userId, {
      method: "POST",
      body: form,
    })
  );
  assert.equal(uploadRes.status, 201, "source upload should return 201");

  const governanceRes = await getSourceGovernance(
    authedRequest("http://localhost/api/source-governance", orgId, userId)
  );
  assert.equal(governanceRes.status, 200, "source governance GET should return 200");
  const governancePayload = (await governanceRes.json()) as {
    data: {
      logs: Array<{ action: string }>;
      jobs: Array<{ status: string }>;
      sources: Array<{ id: string }>;
    };
  };

  assert.ok(governancePayload.data.sources.length > 0, "source governance should include sources");
  assert.ok(governancePayload.data.jobs.length > 0, "source governance should include jobs");
  assert.ok(
    governancePayload.data.logs.some((log) => log.action === "source_uploaded"),
    "source governance should include source_uploaded log"
  );

  const reviewQueueRes = await getReviewQueue(
    authedRequest("http://localhost/api/review-queue", orgId, userId)
  );
  assert.equal(reviewQueueRes.status, 200, "review queue GET should return 200");
  const reviewQueuePayload = (await reviewQueueRes.json()) as {
    data: {
      sections: Array<{
        items: Array<{ id: string; entityType: "policy" | "terminology" | "conflict" }>;
      }>;
    };
  };

  const firstItem = reviewQueuePayload.data.sections.flatMap((section) => section.items)[0];
  assert.ok(firstItem, "review queue should include at least one item");

  const reviewActionRes = await reviewAction(
    authedRequest("http://localhost/api/review-queue/actions", orgId, userId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemType: firstItem.entityType,
        itemId: firstItem.id,
        action: "approve",
      }),
    })
  );
  assert.equal(reviewActionRes.status, 200, "review action approve should return 200");

  const reviewEventsRes = await getReviewEvents(
    authedRequest("http://localhost/api/review-events", orgId, userId)
  );
  assert.equal(reviewEventsRes.status, 200, "review events GET should return 200");
  const reviewEventsPayload = (await reviewEventsRes.json()) as {
    data: Array<{ itemId: string; action: string }>;
  };
  assert.ok(
    reviewEventsPayload.data.some((event) => event.itemId === firstItem.id && event.action === "approve"),
    "review events should include the approve action"
  );

  const exportRes = await createExport(
    authedRequest("http://localhost/api/exports", orgId, userId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exportType: "full_pack" }),
    })
  );
  assert.equal(exportRes.status, 201, "export create should return 201");
  const exportPayload = (await exportRes.json()) as { data: { id: string } };

  const verifyRes = await verifyExport(
    authedRequest(`http://localhost/api/exports/${exportPayload.data.id}/verify`, orgId, userId),
    { params: Promise.resolve({ id: exportPayload.data.id }) }
  );
  assert.equal(verifyRes.status, 200, "export verify should return 200");
  const verifyPayload = (await verifyRes.json()) as {
    data: {
      manifest: { checksumValid: boolean; signatureValid: boolean };
      artifactChecks: Array<{ valid: boolean }>;
    };
  };

  assert.equal(verifyPayload.data.manifest.checksumValid, true, "manifest checksum should validate");
  assert.equal(verifyPayload.data.manifest.signatureValid, true, "manifest signature should validate");
  assert.equal(
    verifyPayload.data.artifactChecks.every((check) => check.valid),
    true,
    "all artifact checksums should validate"
  );

  console.log("[smoke] phase2 supabase-backed run passed");
}

main().catch((error) => {
  console.error("[smoke] phase2 supabase-backed run failed", error);
  process.exitCode = 1;
});
