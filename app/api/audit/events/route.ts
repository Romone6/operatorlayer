import { NextRequest } from "next/server";
import { z } from "zod";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { AuditEvent, Severity } from "@/lib/types";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  cursor: z.string().datetime().optional(),
  category: z
    .enum(["ingestion", "review", "enterprise", "connector", "billing", "security", "governance"])
    .optional(),
});

function classifyCategory(action: string): AuditEvent["category"] {
  if (action.startsWith("enterprise:connector")) return "connector";
  if (action.startsWith("enterprise:billing")) return "billing";
  if (action.startsWith("enterprise:api_key") || action.startsWith("enterprise:webhook")) return "security";
  if (
    action.startsWith("enterprise:deletion") ||
    action.startsWith("enterprise:governance") ||
    action.startsWith("enterprise:break_glass") ||
    action.startsWith("enterprise:legal_hold")
  ) {
    return "governance";
  }
  if (action.startsWith("enterprise:")) return "enterprise";
  return "ingestion";
}

function classifySeverity(action: string): Severity {
  if (action.includes("break_glass_invoked")) return "critical";
  if (action.includes("legal_hold_placed")) return "critical";
  if (action.includes("failed") || action.includes("disabled") || action.includes("revoked")) return "high";
  if (action.includes("deleted") || action.includes("deletion")) return "critical";
  return "medium";
}

function redactMetadata(metadata: Record<string, unknown>) {
  const redacted = { ...metadata };
  for (const key of ["secretEncrypted", "tokenEncrypted", "hashedKey"]) {
    if (key in redacted) {
      redacted[key] = "[redacted]";
    }
  }
  return redacted;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const parsedQuery = querySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
    });
    const limit = parsedQuery.limit ?? 50;

    const [ingestionLogs, reviewEvents] = await Promise.all([
      repository.listIngestionLogs(context.organisationId),
      repository.listReviewEvents(context.organisationId),
    ]);

    const mappedIngestion: AuditEvent[] = ingestionLogs.map((log) => ({
      id: log.id,
      organisationId: log.organisationId,
      category: classifyCategory(log.action),
      action: log.action,
      actorId: typeof log.details.actorId === "string" ? log.details.actorId : null,
      severity: classifySeverity(log.action),
      recoverable: !log.action.includes("failed"),
      traceId: typeof log.details.traceId === "string" ? log.details.traceId : null,
      occurredAt: log.createdAt,
      metadata: redactMetadata(log.details),
    }));

    const mappedReview: AuditEvent[] = reviewEvents.map((event) => ({
      id: event.id,
      organisationId: event.organisationId,
      category: "review",
      action: `review.${event.action}`,
      actorId: event.actorId,
      severity: "medium",
      recoverable: true,
      traceId: null,
      occurredAt: event.createdAt,
      metadata: {
        itemType: event.itemType,
        itemId: event.itemId,
        beforeState: event.beforeState,
        afterState: event.afterState,
      },
    }));

    let combined = [...mappedIngestion, ...mappedReview].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt)
    );

    if (parsedQuery.category) {
      combined = combined.filter((event) => event.category === parsedQuery.category);
    }
    if (parsedQuery.cursor) {
      combined = combined.filter((event) => event.occurredAt < parsedQuery.cursor!);
    }

    const page = combined.slice(0, limit);
    const nextCursor = combined.length > limit ? page[page.length - 1]?.occurredAt ?? null : null;

    return jsonOk({
      events: page,
      pageInfo: {
        count: page.length,
        limit,
        nextCursor,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
