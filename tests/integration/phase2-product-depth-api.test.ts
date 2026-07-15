import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";
import { GET as getSourceGovernance } from "@/app/api/source-governance/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { GET as getReviewQueue } from "@/app/api/review-queue/route";
import { POST as runReviewAction } from "@/app/api/review-queue/actions/route";
import { GET as getReviewEvents } from "@/app/api/review-events/route";
import { POST as createExport } from "@/app/api/exports/route";
import { GET as verifyExport } from "@/app/api/exports/[id]/verify/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, orgId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const request = new NextRequest("http://localhost/api/organisations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "test-user-001",
    },
    body: JSON.stringify({ name: "Phase 2 Org", industry: "SaaS" }),
  });

  const response = await createOrganisation(request);
  expect(response.status).toBe(201);
  const payload = (await response.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("phase 2 product-depth APIs", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("reads and updates organisation settings", async () => {
    const orgId = await createOrg();

    const beforeResponse = await getSettings(authedRequest("http://localhost/api/settings", orgId));
    expect(beforeResponse.status).toBe(200);
    const beforePayload = (await beforeResponse.json()) as {
      data: {
        organisation: { name: string; riskTolerance: string };
        controls: { defaultTone: string; modelProvider: string };
      };
    };

    expect(beforePayload.data.organisation.name).toBe("Phase 2 Org");
    expect(beforePayload.data.controls.defaultTone).toBe("consultative");

    const patchResponse = await patchSettings(
      authedRequest("http://localhost/api/settings", orgId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation: {
            name: "Phase 2 Org Updated",
            riskTolerance: "high",
            autoSendAllowed: false,
          },
          controls: {
            defaultTone: "confident",
            modelProvider: "openai",
            pricingApprovalThreshold: 20,
            refundApprovalThreshold: 1500,
            dataRetentionDays: 730,
          },
        }),
      })
    );

    expect(patchResponse.status).toBe(200);
    const patchPayload = (await patchResponse.json()) as {
      data: {
        organisation: { name: string; riskTolerance: string };
        controls: { defaultTone: string; pricingApprovalThreshold: number; dataRetentionDays: number };
      };
    };

    expect(patchPayload.data.organisation.name).toBe("Phase 2 Org Updated");
    expect(patchPayload.data.organisation.riskTolerance).toBe("high");
    expect(patchPayload.data.controls.defaultTone).toBe("confident");
    expect(patchPayload.data.controls.pricingApprovalThreshold).toBe(20);
    expect(patchPayload.data.controls.dataRetentionDays).toBe(730);
  });

  it("returns source governance logs and review events after actions", async () => {
    const orgId = await createOrg();

    const form = new FormData();
    form.set("title", "Governance Manual");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "high");
    form.set("pastedText", "Price is too high. Based on what you shared, a scoped pilot may fit.");

    const uploadResponse = await uploadSource(
      authedRequest("http://localhost/api/sources/upload", orgId, {
        method: "POST",
        body: form,
      })
    );
    expect(uploadResponse.status).toBe(201);

    const governanceResponse = await getSourceGovernance(
      authedRequest("http://localhost/api/source-governance", orgId)
    );
    expect(governanceResponse.status).toBe(200);
    const governancePayload = (await governanceResponse.json()) as {
      data: {
        sources: Array<{ id: string }>;
        jobs: Array<{ id: string }>;
        logs: Array<{ action: string }>;
      };
    };

    expect(governancePayload.data.sources.length).toBeGreaterThan(0);
    expect(governancePayload.data.jobs.length).toBeGreaterThan(0);
    expect(governancePayload.data.logs.some((log) => log.action === "source_uploaded")).toBe(true);

    const queueResponse = await getReviewQueue(authedRequest("http://localhost/api/review-queue", orgId));
    const queuePayload = (await queueResponse.json()) as {
      data: {
        sections: Array<{
          items: Array<{ id: string; entityType: "policy" | "terminology" | "conflict" }>;
        }>;
      };
    };

    const firstItem = queuePayload.data.sections.flatMap((section) => section.items)[0];
    expect(firstItem).toBeTruthy();

    const actionResponse = await runReviewAction(
      authedRequest("http://localhost/api/review-queue/actions", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: firstItem.entityType,
          itemId: firstItem.id,
          action: "approve",
        }),
      })
    );
    expect(actionResponse.status).toBe(200);

    const eventsResponse = await getReviewEvents(authedRequest("http://localhost/api/review-events", orgId));
    expect(eventsResponse.status).toBe(200);
    const eventsPayload = (await eventsResponse.json()) as {
      data: Array<{ itemId: string; action: string }>;
    };

    expect(eventsPayload.data.some((event) => event.itemId === firstItem.id && event.action === "approve")).toBe(true);
  });

  it("verifies export manifest and artifact checksums", async () => {
    const orgId = await createOrg();

    const exportResponse = await createExport(
      authedRequest("http://localhost/api/exports", orgId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: "full_pack" }),
      })
    );

    expect(exportResponse.status).toBe(201);
    const exportPayload = (await exportResponse.json()) as { data: { id: string } };

    const verifyResponse = await verifyExport(
      authedRequest(`http://localhost/api/exports/${exportPayload.data.id}/verify`, orgId),
      { params: Promise.resolve({ id: exportPayload.data.id }) }
    );

    expect(verifyResponse.status).toBe(200);
    const verifyPayload = (await verifyResponse.json()) as {
      data: {
        manifest: { checksumValid: boolean; signatureValid: boolean };
        artifactChecks: Array<{ valid: boolean }>;
      };
    };

    expect(verifyPayload.data.manifest.checksumValid).toBe(true);
    expect(verifyPayload.data.manifest.signatureValid).toBe(true);
    expect(verifyPayload.data.artifactChecks.every((item) => item.valid)).toBe(true);
  });
});

