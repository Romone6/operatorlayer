import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveAutoSendDecisionRecord } from "@/lib/enterprise/store";
import { decideAutoSend } from "@/lib/enterprise/send-policy";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { resolveRequestIdempotencyKey } from "@/lib/services/idempotency";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { autoSendDecisionSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer", "analyst"]);
    const payload = autoSendDecisionSchema.parse(await request.json());
    const repository = getRepository();
    const idempotencyHeader = request.headers.get("idempotency-key")?.trim();
    const requestKey = idempotencyHeader
      ? resolveRequestIdempotencyKey(request, "auto_send_decide", {
          organisationId: context.organisationId,
          evaluationId: payload.evaluationId ?? null,
          scenarioId: payload.scenarioId ?? null,
          workspaceId: payload.workspaceId ?? null,
          score: payload.score,
          riskLevel: payload.riskLevel,
          channel: payload.channel,
          customerType: payload.customerType,
          recipient: payload.recipient,
          draft: payload.draft,
          evidence: payload.evidence,
        })
      : null;
    if (requestKey) {
      const existing = await resolveAutoSendDecisionRecord(
        repository,
        context.organisationId,
        requestKey
      );
      if (existing) {
        return jsonOk(existing);
      }
    }

    const decision = await decideAutoSend(repository, {
      organisationId: context.organisationId,
      score: payload.score,
      riskLevel: payload.riskLevel,
      scenarioId: payload.scenarioId,
      workspaceId: payload.workspaceId,
      channel: payload.channel,
      customerType: payload.customerType,
    });
    if (!decision.allowed && decision.runtimeUnavailable) {
      await repository.createIngestionLog({
        organisationId: context.organisationId,
        sourceId: null,
        action: "enterprise:capability_runtime_denied",
        details: {
          capabilityId: decision.runtimeUnavailable.capabilityId,
          reason: decision.runtimeUnavailable.reason,
          actorId: context.userId,
          surface: "auto_send_decide",
        },
      });
    }

    const sendEvent = {
      id: crypto.randomUUID(),
      organisationId: context.organisationId,
      evaluationId: payload.evaluationId ?? null,
      scenarioId: payload.scenarioId ?? null,
      workspaceId: payload.workspaceId ?? null,
      channel: payload.channel,
      recipient: payload.recipient,
      draft: payload.draft,
      status: decision.allowed ? ("queued" as const) : ("blocked" as const),
      reason: decision.reason,
      evidence: payload.evidence,
      autoSend: decision.allowed,
      decisionSnapshot: {
        allowed: decision.allowed,
        state: decision.state,
        reason: decision.reason,
        matchedRuleId: decision.matchedRuleId,
        approvalRequired: decision.approvalRequired,
        approvalDecisionStatus: decision.approvalDecision.status,
        approvalDecisionReason: decision.approvalDecision.reason,
        approvalDecisionRuleId: decision.approvalDecision.matchedRuleId,
      },
      reviewState: {
        required: decision.approvalRequired,
        status: decision.approvalRequired ? "pending" : ("not_required" as const),
        reviewerId: null,
        reviewedAt: null,
      },
      riskState: {
        score: payload.score,
        riskLevel: payload.riskLevel,
        overrideApplied: false,
        overrideReason: null,
      },
      connectorTarget: {
        channel: payload.channel,
        recipient: payload.recipient,
        workspaceId: payload.workspaceId ?? null,
        providerHint: null,
      },
      delivery: {
        state: decision.allowed ? ("attempted" as const) : ("not_started" as const),
        queuedAt: new Date().toISOString(),
        lastAttemptAt: decision.allowed ? new Date().toISOString() : null,
        confirmedAt: null,
        confirmationSource: null,
        confirmationId: null,
        failureReason: null,
      },
      createdBy: context.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await appendEnterpriseEvent(repository, context, {
      action: "send_event_created",
      payload: sendEvent,
    });

    if (decision.allowed) {
      await enqueueJobWithIdempotency(repository, {
        organisationId: context.organisationId,
        jobType: "auto_send",
        payload: {
          sendEventId: sendEvent.id,
          workspaceId: sendEvent.workspaceId,
        },
        idempotencyKey: `auto_send:${sendEvent.id}`,
      });
    }

    if (requestKey) {
      await appendEnterpriseEvent(repository, context, {
        action: "auto_send_decision_recorded",
        payload: {
          requestKey,
          decision,
          sendEvent,
        },
      });
    }

    return jsonOk({
      decision,
      sendEvent,
    });
  } catch (error) {
    return jsonError(error);
  }
}
