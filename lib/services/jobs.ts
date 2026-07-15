import { AppError } from "@/lib/errors";
import type { OperatorRepository } from "@/lib/repository/interface";
import {
  getConnectorAccessToken,
  resolveAutoSendKillSwitchState,
  resolveConnectors,
  resolveSendEvents,
  resolveWebhookSecret,
  resolveWebhookSubscriptions,
} from "@/lib/enterprise/store";
import { isInviteEmailDispatchActionable, sendInviteEmail } from "@/lib/services/member-invites";
import { ingestConnectorData } from "@/lib/services/connectors/ingestion";
import { processSourceExtraction } from "@/lib/services/pipeline";
import { evaluateAndRepairDraft, generateExportPack } from "@/lib/services/playground";
import { isWebhookEventSubscribed } from "@/lib/services/webhook-subscriptions";
import crypto from "node:crypto";

export async function runNextQueuedJob(
  repository: OperatorRepository,
  organisationId: string
) {
  const job = await repository.getNextQueuedJob(organisationId);
  if (!job) {
    return { processed: false };
  }

  await repository.updateJob({
    jobId: job.id,
    organisationId,
    status: "running",
    payloadPatch: {
      firstStartedAt:
        typeof job.payload.firstStartedAt === "string"
          ? job.payload.firstStartedAt
          : new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
    },
  });

  try {
    let inviteDeliverySkippedReason: string | null = null;
    if (job.jobType === "source_extraction") {
      const sourceId = String(job.payload.sourceId ?? job.sourceId ?? "");
      if (!sourceId) {
        throw new AppError(400, "job_payload_invalid", "source_extraction job missing sourceId payload.");
      }
      const source = await repository.getSourceById(organisationId, sourceId);
      if (!source) {
        throw new AppError(404, "source_not_found", "Source not found for extraction job.");
      }
      if (!source.rawText) {
        throw new AppError(400, "source_raw_text_missing", "Source has no raw text for extraction.");
      }
      await processSourceExtraction(repository, source);
    }

    if (job.jobType === "draft_evaluation") {
      await evaluateAndRepairDraft({
        repository,
        organisationId,
        inputMessage: String(job.payload.inputMessage ?? ""),
        channel: String(job.payload.channel ?? "email"),
        team: String(job.payload.team ?? "general"),
        customerType: String(job.payload.customerType ?? "standard"),
        context: typeof job.payload.context === "string" ? job.payload.context : undefined,
        draft: typeof job.payload.draft === "string" ? job.payload.draft : undefined,
      });
    }

    if (job.jobType === "export_generation") {
      await generateExportPack(repository, organisationId);
    }

    if (job.jobType === "invite_delivery") {
      const inviteId = String(job.payload.inviteId ?? "");
      if (!inviteId) {
        throw new AppError(400, "job_payload_invalid", "invite_delivery job missing inviteId payload.");
      }

      const invite = (await repository.listMemberInvites(organisationId)).find((item) => item.id === inviteId);
      if (!invite) {
        throw new AppError(404, "invite_not_found", "Invite not found for delivery job.");
      }
      if (invite.status !== "pending") {
        inviteDeliverySkippedReason = "invite_not_pending";
      }
      if (!inviteDeliverySkippedReason) {
        if (new Date(invite.expiresAt).getTime() <= Date.now()) {
          await repository.updateMemberInviteStatus(invite.id, "expired");
          inviteDeliverySkippedReason = "invite_expired";
        } else {
          const appOrigin =
            process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
          const acceptUrl = `${appOrigin}/invite/${invite.inviteToken}`;
          const dispatch = await sendInviteEmail({
            email: invite.email,
            role: invite.role,
            organisationId,
            inviteToken: invite.inviteToken,
            acceptUrl,
          });

          if (!isInviteEmailDispatchActionable(dispatch)) {
            throw new AppError(503, "invite_delivery_unavailable", "Invite delivery is not available.", {
              dispatch,
              inviteId: invite.id,
            });
          }
        }
      }
    }

    if (job.jobType === "connector_sync") {
      const provider = String(job.payload.provider ?? "");
      if (!provider) {
        throw new AppError(400, "job_payload_invalid", "connector_sync job missing provider payload.");
      }
      const connectors = await resolveConnectors(repository, organisationId);
      const connector = connectors.find((item) => item.provider === provider);
      if (!connector) {
        throw new AppError(404, "connector_not_found", "Connector not found for sync.");
      }
      const accessToken = await getConnectorAccessToken(repository, organisationId, connector.provider);
      if (!accessToken) {
        throw new AppError(409, "connector_token_missing", "Connector access token is missing.");
      }
      const extractedText = await ingestConnectorData({
        connector,
        accessToken,
      });
      if (!extractedText.trim()) {
        throw new AppError(409, "connector_empty_sync", "Connector sync returned no usable text.");
      }
      const source = await repository.createSource({
        organisationId,
        title: `${provider} sync ${new Date().toISOString()}`,
        sourceType: provider,
        authorityLevel: "connector",
        rawText: extractedText,
        metadata: {
          connectorProvider: provider,
          syncedAt: new Date().toISOString(),
        },
      });
      await repository.enqueueJob({
        organisationId,
        sourceId: source.id,
        jobType: "source_extraction",
        payload: {
          sourceId: source.id,
          idempotencyKey: `source_extraction:${source.id}`,
        },
      });
      await repository.createIngestionLog({
        organisationId,
        sourceId: null,
        action: "enterprise:connector_sync_result",
        details: {
          provider,
          syncStatus: "succeeded",
          actorId: "job_worker",
        },
      });
    }

    if (job.jobType === "auto_send") {
      const sendEventId = String(job.payload.sendEventId ?? "");
      if (!sendEventId) {
        throw new AppError(400, "job_payload_invalid", "auto_send job missing sendEventId payload.");
      }
      const workspaceId =
        typeof job.payload.workspaceId === "string" ? job.payload.workspaceId.trim() : "";
      const killSwitch = await resolveAutoSendKillSwitchState(repository, organisationId);
      if (killSwitch.global.active) {
        throw new AppError(
          409,
          "auto_send_kill_switch_active",
          `Global auto-send kill switch active: ${killSwitch.global.reason}`
        );
      }
      if (workspaceId) {
        const scoped = killSwitch.workspaces.find((item) => item.workspaceId === workspaceId);
        if (scoped?.active) {
          throw new AppError(
            409,
            "auto_send_kill_switch_active",
            `Workspace auto-send kill switch active for ${workspaceId}: ${scoped.reason}`
          );
        }
      }
      const existing = (await resolveSendEvents(repository, organisationId)).find(
        (event) => event.id === sendEventId
      );
      await repository.createIngestionLog({
        organisationId,
        sourceId: null,
        action: "enterprise:send_event_status_updated",
        details: {
          id: sendEventId,
          status: "sent",
          reason: "Auto-send worker completed delivery.",
          previousStatus: existing?.status ?? "queued",
          actorId: "job_worker",
        },
      });
      await repository.createIngestionLog({
        organisationId,
        sourceId: null,
        action: "enterprise:send_event_delivery_confirmed",
        details: {
          id: sendEventId,
          reason: "Delivery confirmation persisted by auto-send worker.",
          confirmationSource: "auto_send_worker",
          confirmationId: crypto.randomUUID(),
          actorId: "job_worker",
        },
      });
      const webhooks = await resolveWebhookSubscriptions(repository, organisationId);
      for (const webhook of webhooks.filter((item) => item.status === "active")) {
        if (!isWebhookEventSubscribed(webhook.events, "send_event.created")) {
          continue;
        }
        await repository.enqueueJob({
          organisationId,
          jobType: "webhook_delivery",
          payload: {
            webhookId: webhook.id,
            eventType: "send_event.created",
            sendEventId,
            idempotencyKey: `webhook_delivery:${webhook.id}:${sendEventId}`,
          },
        });
      }
    }

    if (job.jobType === "webhook_delivery") {
      const webhookId = String(job.payload.webhookId ?? "");
      const eventType = String(job.payload.eventType ?? "");
      if (!webhookId || !eventType) {
        throw new AppError(400, "job_payload_invalid", "webhook_delivery payload is missing webhookId or eventType.");
      }
      const subscriptions = await resolveWebhookSubscriptions(repository, organisationId);
      const target = subscriptions.find((item) => item.id === webhookId);
      if (!target || target.status !== "active") {
        throw new AppError(404, "webhook_not_active", "Webhook subscription is not active.");
      }
      if (!isWebhookEventSubscribed(target.events, eventType)) {
        throw new AppError(
          409,
          "webhook_event_not_subscribed",
          "Webhook subscription does not include this event type."
        );
      }
      const secret = await resolveWebhookSecret(repository, organisationId, webhookId);
      if (!secret) {
        throw new AppError(404, "webhook_secret_missing", "Webhook signing secret not found.");
      }
      const payload = {
        id: crypto.randomUUID(),
        type: eventType,
        createdAt: new Date().toISOString(),
        data: job.payload,
      };
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${body}`)
        .digest("hex");
      const response = await fetch(target.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OperatorLayer-Timestamp": timestamp,
          "X-OperatorLayer-Signature": `v1=${signature}`,
          "X-OperatorLayer-Event-Type": eventType,
        },
        body,
      });
      await repository.createIngestionLog({
        organisationId,
        sourceId: null,
        action: "enterprise:webhook_delivery_attempt",
        details: {
          webhookId,
          eventType,
          statusCode: response.status,
          attempt: job.attempts,
          deliveredAt: new Date().toISOString(),
        },
      });
      if (!response.ok) {
        throw new AppError(502, "webhook_delivery_failed", "Webhook delivery failed.", {
          webhookId,
          status: response.status,
        });
      }
    }

    const completed = await repository.updateJob({
      jobId: job.id,
      organisationId,
      status: "succeeded",
    });
    return { processed: true, job: completed, skippedReason: inviteDeliverySkippedReason };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected job failure";
    const code = error instanceof AppError ? error.code : "internal_error";
    const maxAttempts = job.jobType === "webhook_delivery" ? 5 : 2;
    const failedStatus =
      job.attempts >= maxAttempts ? "dead_letter" : "failed";
    const nextAttemptAt =
      failedStatus === "failed"
        ? new Date(Date.now() + Math.min(30, Math.max(1, job.attempts + 1) * 2) * 60_000).toISOString()
        : null;

    await repository.updateJob({
      jobId: job.id,
      organisationId,
      status: failedStatus,
      errorMessage: message,
      payloadPatch: {
        ...(nextAttemptAt ? { nextAttemptAt } : {}),
        lastErrorCode: code,
        ...(failedStatus === "dead_letter" ? { terminalFailureClass: code } : {}),
      },
    });

    if (job.jobType === "auto_send") {
      const sendEventId = String(job.payload.sendEventId ?? "");
      if (sendEventId) {
        const status = code === "auto_send_kill_switch_active" ? "blocked" : "failed";
        await repository.createIngestionLog({
          organisationId,
          sourceId: null,
          action: "enterprise:send_event_status_updated",
          details: {
            id: sendEventId,
            status,
            reason: message,
            failureCode: code,
            actorId: "job_worker",
          },
        });
      }
    }

    throw error;
  }
}
