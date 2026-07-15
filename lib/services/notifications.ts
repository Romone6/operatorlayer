import { isWebhookEventSubscribed } from "@/lib/services/webhook-subscriptions";
import { enqueueJobWithIdempotency } from "@/lib/services/job-queue";
import { resolveWebhookSubscriptions } from "@/lib/enterprise/store";
import type { OperatorRepository } from "@/lib/repository/interface";

export type NotificationDestinationState =
  | {
      destination: "dashboard";
      state: "recorded";
      reason: "dashboard_audit_record";
      jobId: null;
    }
  | {
      destination: "webhook";
      state: "queued";
      reason: "active_subscription_matched";
      jobId: string;
      webhookId: string;
      eventType: string;
    }
  | {
      destination: "webhook";
      state: "unavailable";
      reason: "no_active_subscription";
      jobId: null;
      eventType: string;
    }
  | {
      destination: "slack" | "linear" | "teams" | "email";
      state: "unavailable";
      reason: "provider_not_implemented";
      jobId: null;
    }
  | {
      destination: string;
      state: "unavailable";
      reason: "unsupported_destination";
      jobId: null;
    };

export type NotificationRoutingRecord = {
  id: string;
  eventType: "runtime_governance.decision" | "calibration.recommendation";
  state: "not_required" | "recorded" | "partially_queued" | "queued" | "unavailable";
  reason: string;
  destinations: NotificationDestinationState[];
  createdAt: string;
};

const supportedUnavailable = new Set(["slack", "linear", "teams", "email"]);

function nowIso() {
  return new Date().toISOString();
}

function normalizeDestination(destination: string) {
  return destination.trim().toLowerCase().replace(/^microsoft-/, "");
}

function summarizeState(destinations: NotificationDestinationState[]) {
  if (destinations.length === 0) return "not_required" as const;
  const queued = destinations.filter((item) => item.state === "queued").length;
  const recorded = destinations.filter((item) => item.state === "recorded").length;
  const unavailable = destinations.filter((item) => item.state === "unavailable").length;
  if (queued > 0 && unavailable > 0) return "partially_queued" as const;
  if (queued > 0) return "queued" as const;
  if (recorded > 0 && unavailable === 0) return "recorded" as const;
  if (recorded > 0 && unavailable > 0) return "partially_queued" as const;
  return "unavailable" as const;
}

export async function getNotificationDestinationStatus(
  repository: OperatorRepository,
  organisationId: string
) {
  const webhooks = await resolveWebhookSubscriptions(repository, organisationId);
  const activeRuntimeWebhooks = webhooks.filter(
    (webhook) =>
      webhook.status === "active" && isWebhookEventSubscribed(webhook.events, "runtime_governance.decision")
  );
  return [
    {
      destination: "dashboard",
      state: "available",
      reason: "dashboard_audit_record",
    },
    {
      destination: "webhook",
      state: activeRuntimeWebhooks.length > 0 ? "available" : "unavailable",
      reason: activeRuntimeWebhooks.length > 0 ? "active_subscription_matched" : "no_active_subscription",
      activeSubscriptions: activeRuntimeWebhooks.length,
    },
    ...["slack", "linear", "teams", "email"].map((destination) => ({
      destination,
      state: "unavailable",
      reason: "provider_not_implemented",
      activeSubscriptions: 0,
    })),
  ];
}

export async function routeRuntimeNotification(input: {
  repository: OperatorRepository;
  organisationId: string;
  actorId: string;
  decisionId: string;
  evaluationId: string;
  policyPackId: string | null;
  notificationIntent: {
    state: string;
    reason: string;
    destinations: string[];
  };
  metadata?: Record<string, unknown>;
}): Promise<NotificationRoutingRecord> {
  const eventType = "runtime_governance.decision" as const;
  const createdAt = nowIso();
  const requestedDestinations = Array.from(
    new Set(input.notificationIntent.destinations.map(normalizeDestination).filter(Boolean))
  );
  const destinations: NotificationDestinationState[] = [];

  if (input.notificationIntent.state === "not_required" || requestedDestinations.length === 0) {
    const record: NotificationRoutingRecord = {
      id: input.decisionId,
      eventType,
      state: "not_required",
      reason: input.notificationIntent.reason,
      destinations,
      createdAt,
    };
    await input.repository.createIngestionLog({
      organisationId: input.organisationId,
      sourceId: null,
      action: "enterprise:notification_route_recorded",
      details: {
        actorId: input.actorId,
        routing: record,
        decisionId: input.decisionId,
        evaluationId: input.evaluationId,
        policyPackId: input.policyPackId,
      },
    });
    return record;
  }

  const webhooks = await resolveWebhookSubscriptions(input.repository, input.organisationId);
  for (const requested of requestedDestinations) {
    if (requested === "dashboard") {
      destinations.push({
        destination: "dashboard",
        state: "recorded",
        reason: "dashboard_audit_record",
        jobId: null,
      });
      continue;
    }

    if (requested === "webhook" || requested === "webhooks") {
      const active = webhooks
        .filter((webhook) => webhook.status === "active")
        .filter((webhook) => isWebhookEventSubscribed(webhook.events, eventType));
      if (active.length === 0) {
        destinations.push({
          destination: "webhook",
          state: "unavailable",
          reason: "no_active_subscription",
          jobId: null,
          eventType,
        });
        continue;
      }
      for (const webhook of active) {
        const job = await enqueueJobWithIdempotency(input.repository, {
          organisationId: input.organisationId,
          jobType: "webhook_delivery",
          payload: {
            webhookId: webhook.id,
            eventType,
            payload: {
              decisionId: input.decisionId,
              evaluationId: input.evaluationId,
              policyPackId: input.policyPackId,
              notificationReason: input.notificationIntent.reason,
              metadata: input.metadata ?? {},
            },
          },
          idempotencyKey: `notification:${eventType}:${input.decisionId}:${webhook.id}`,
        });
        destinations.push({
          destination: "webhook",
          state: "queued",
          reason: "active_subscription_matched",
          jobId: job.id,
          webhookId: webhook.id,
          eventType,
        });
      }
      continue;
    }

    if (supportedUnavailable.has(requested)) {
      destinations.push({
        destination: requested as "slack" | "linear" | "teams" | "email",
        state: "unavailable",
        reason: "provider_not_implemented",
        jobId: null,
      });
      continue;
    }

    destinations.push({
      destination: requested,
      state: "unavailable",
      reason: "unsupported_destination",
      jobId: null,
    });
  }

  const record: NotificationRoutingRecord = {
    id: input.decisionId,
    eventType,
    state: summarizeState(destinations),
    reason: input.notificationIntent.reason,
    destinations,
    createdAt,
  };
  await input.repository.createIngestionLog({
    organisationId: input.organisationId,
    sourceId: null,
    action: "enterprise:notification_route_recorded",
    details: {
      actorId: input.actorId,
      routing: record,
      decisionId: input.decisionId,
      evaluationId: input.evaluationId,
      policyPackId: input.policyPackId,
    },
  });
  return record;
}
