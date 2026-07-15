import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { ReviewItem, ReviewStatus, Severity } from "@/lib/types";

const validReviewStatuses = new Set<ReviewStatus>([
  "suggested",
  "approved",
  "rejected",
  "needs_review",
  "outdated",
  "weak",
  "blocked",
]);

function normalizeReviewStatus(status: string): ReviewStatus {
  return validReviewStatuses.has(status as ReviewStatus) ? (status as ReviewStatus) : "needs_review";
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const queue = await repository.listReviewQueue(context.organisationId);
    const items: ReviewItem[] = queue.sections.flatMap((section) =>
      section.items.map((item) => {
        if (item.entityType === "policy") {
          return {
            ...item,
            kind: "policy",
            entityType: "policy",
            status: normalizeReviewStatus(item.status),
            severity: ((item.severity as Severity | undefined) ?? "medium") as Severity,
            confidence: item.confidence ?? 0,
          };
        }
        if (item.entityType === "terminology") {
          return {
            ...item,
            kind: "terminology",
            entityType: "terminology",
            status: normalizeReviewStatus(item.status),
            confidence: item.confidence ?? 0,
          };
        }
        return {
          ...item,
          kind: "conflict",
          entityType: "conflict",
          status: normalizeReviewStatus(item.status),
          severity: ((item.severity as Severity | undefined) ?? "medium") as Severity,
        };
      })
    );
    return jsonOk({
      ...queue,
      items,
    });
  } catch (error) {
    return jsonError(error);
  }
}
