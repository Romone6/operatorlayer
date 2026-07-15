import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as createOrganisation } from "@/app/api/organisations/route";
import { GET as listMembers } from "@/app/api/members/route";
import { PATCH as patchMemberRole } from "@/app/api/members/[id]/route";
import { PATCH as patchSettings } from "@/app/api/settings/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { GET as getReviewQueue } from "@/app/api/review-queue/route";
import { POST as reviewAction } from "@/app/api/review-queue/actions/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function request(
  url: string,
  orgId: string,
  role: "owner" | "admin" | "reviewer" | "analyst" | "member",
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  headers.set("x-user-email", "owner@example.com");
  return new NextRequest(url, { ...init, headers });
}

async function createOrg() {
  const createRes = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "test-user-001",
        "x-user-email": "owner@example.com",
      },
      body: JSON.stringify({ name: "Auth Org" }),
    })
  );
  expect(createRes.status).toBe(201);
  const payload = (await createRes.json()) as { data: { id: string } };
  return payload.data.id;
}

describe("role authorization and members API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("allows owner to list members and blocks member", async () => {
    const orgId = await createOrg();

    const ownerRes = await listMembers(request("http://localhost/api/members", orgId, "owner"));
    expect(ownerRes.status).toBe(200);
    const ownerPayload = (await ownerRes.json()) as { data: Array<{ id: string; role: string }> };
    expect(ownerPayload.data).toHaveLength(1);
    expect(ownerPayload.data[0].role).toBe("owner");

    const memberRes = await listMembers(request("http://localhost/api/members", orgId, "member"));
    expect(memberRes.status).toBe(403);
  });

  it("blocks demoting the last owner", async () => {
    const orgId = await createOrg();

    const membersRes = await listMembers(request("http://localhost/api/members", orgId, "owner"));
    const membersPayload = (await membersRes.json()) as { data: Array<{ id: string }> };
    const ownerUserId = membersPayload.data[0].id;

    const demoteRes = await patchMemberRole(
      request(`http://localhost/api/members/${ownerUserId}`, orgId, "owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "member" }),
      }),
      { params: Promise.resolve({ id: ownerUserId }) }
    );

    expect(demoteRes.status).toBe(400);
  });

  it("enforces role checks on settings, upload, and review actions", async () => {
    const orgId = await createOrg();

    const settingsDenied = await patchSettings(
      request("http://localhost/api/settings", orgId, "member", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisation: { name: "Denied" } }),
      })
    );
    expect(settingsDenied.status).toBe(403);

    const uploadForm = new FormData();
    uploadForm.set("title", "Role Manual");
    uploadForm.set("sourceType", "pasted_text");
    uploadForm.set("authorityLevel", "standard");
    uploadForm.set("pastedText", "Price is too high. Based on what you shared.");

    const uploadDenied = await uploadSource(
      request("http://localhost/api/sources/upload", orgId, "member", {
        method: "POST",
        body: uploadForm,
      })
    );
    expect(uploadDenied.status).toBe(403);

    const ownerUploadForm = new FormData();
    ownerUploadForm.set("title", "Owner Manual");
    ownerUploadForm.set("sourceType", "pasted_text");
    ownerUploadForm.set("authorityLevel", "standard");
    ownerUploadForm.set("pastedText", "Price is too high. Based on what you shared.");

    const ownerUpload = await uploadSource(
      request("http://localhost/api/sources/upload", orgId, "owner", {
        method: "POST",
        body: ownerUploadForm,
      })
    );
    expect(ownerUpload.status).toBe(201);

    const queueRes = await getReviewQueue(request("http://localhost/api/review-queue", orgId, "owner"));
    const queuePayload = (await queueRes.json()) as {
      data: {
        sections: Array<{ items: Array<{ id: string; entityType: "policy" | "terminology" | "conflict" }> }>;
      };
    };
    const item = queuePayload.data.sections.flatMap((section) => section.items)[0];
    expect(item).toBeTruthy();

    const reviewerAllowed = await reviewAction(
      request("http://localhost/api/review-queue/actions", orgId, "reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: item.entityType,
          itemId: item.id,
          action: "approve",
        }),
      })
    );
    expect(reviewerAllowed.status).toBe(200);

    const memberDenied = await reviewAction(
      request("http://localhost/api/review-queue/actions", orgId, "member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: item.entityType,
          itemId: item.id,
          action: "approve",
        }),
      })
    );
    expect(memberDenied.status).toBe(403);
  });
});
