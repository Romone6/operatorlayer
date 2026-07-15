import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { POST as reviewAction } from "@/app/api/review-queue/actions/route";
import { GET as listReviewQueue } from "@/app/api/review-queue/route";
import { POST as uploadSource } from "@/app/api/sources/upload/route";
import { resetMemoryRepository } from "@/lib/repository/memory";

function authedRequest(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "test-user-001");
  headers.set("x-org-id", "test-org-001");
  return new NextRequest(url, { ...init, headers });
}

describe("review queue API", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("returns grouped review queue sections", async () => {
    const form = new FormData();
    form.set("title", "Queue Manual");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set(
      "pastedText",
      "Price is too high. Based on what you shared, a scoped pilot is safer than discounting."
    );
    await uploadSource(authedRequest("http://localhost/api/sources/upload", { method: "POST", body: form }));

    const response = await listReviewQueue(authedRequest("http://localhost/api/review-queue"));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: { sections: Array<{ id: string; items: unknown[] }>; summary: { total: number } };
    };

    expect(payload.data.sections.length).toBe(5);
    expect(payload.data.summary.total).toBeGreaterThan(0);
  });

  it("applies approve action and reflects in queue summary", async () => {
    const form = new FormData();
    form.set("title", "Queue Action Manual");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "Price is too high. Price is too high. Based on what you shared.");
    await uploadSource(authedRequest("http://localhost/api/sources/upload", { method: "POST", body: form }));

    const queueResponse = await listReviewQueue(authedRequest("http://localhost/api/review-queue"));
    const queuePayload = (await queueResponse.json()) as {
      data: {
        sections: Array<{
          id: string;
          items: Array<{ id: string; entityType: "policy" | "terminology" | "conflict" }>;
        }>;
      };
    };

    const suggested = queuePayload.data.sections.find((section) => section.id === "suggested_rules");
    expect(suggested?.items.length).toBeGreaterThan(0);
    const target = suggested?.items[0];
    expect(target).toBeTruthy();

    const actionResponse = await reviewAction(
      authedRequest("http://localhost/api/review-queue/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: target?.entityType,
          itemId: target?.id,
          action: "approve",
        }),
      })
    );
    expect(actionResponse.status).toBe(200);

    const updatedQueue = await listReviewQueue(authedRequest("http://localhost/api/review-queue"));
    const updatedPayload = (await updatedQueue.json()) as {
      data: {
        summary: { total: number; suggestedRules: number };
      };
    };

    expect(updatedPayload.data.summary.suggestedRules).toBeLessThan(queuePayload.data.sections[0].items.length);
    expect(updatedPayload.data.summary.total).toBeGreaterThanOrEqual(0);
  });

  it("deduplicates request_reprocessing jobs when idempotency key is reused", async () => {
    const form = new FormData();
    form.set("title", "Queue Reprocess Manual");
    form.set("sourceType", "pasted_text");
    form.set("authorityLevel", "standard");
    form.set("pastedText", "Price is too high. Based on what you shared, a scoped pilot is safer.");
    const uploadResponse = await uploadSource(
      authedRequest("http://localhost/api/sources/upload", { method: "POST", body: form })
    );
    const uploadPayload = (await uploadResponse.json()) as { data: { id: string } };
    const sourceId = uploadPayload.data.id;

    const queueResponse = await listReviewQueue(authedRequest("http://localhost/api/review-queue"));
    const queuePayload = (await queueResponse.json()) as {
      data: {
        sections: Array<{
          id: string;
          items: Array<{ id: string; entityType: "policy" | "terminology" | "conflict" }>;
        }>;
      };
    };
    const target = queuePayload.data.sections.flatMap((section) => section.items)[0];
    expect(target).toBeTruthy();

    const firstResponse = await reviewAction(
      authedRequest("http://localhost/api/review-queue/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "review-reprocess-001" },
        body: JSON.stringify({
          itemType: target?.entityType,
          itemId: target?.id,
          action: "request_reprocessing",
          payload: { sourceId },
        }),
      })
    );
    expect(firstResponse.status).toBe(200);
    const firstPayload = (await firstResponse.json()) as { data: { jobId: string } };

    const secondResponse = await reviewAction(
      authedRequest("http://localhost/api/review-queue/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "idempotency-key": "review-reprocess-001" },
        body: JSON.stringify({
          itemType: target?.entityType,
          itemId: target?.id,
          action: "request_reprocessing",
          payload: { sourceId },
        }),
      })
    );
    expect(secondResponse.status).toBe(200);
    const secondPayload = (await secondResponse.json()) as { data: { jobId: string } };
    expect(secondPayload.data.jobId).toBe(firstPayload.data.jobId);
  });
});
