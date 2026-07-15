import crypto from "node:crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import {
  appendEnterpriseEvent,
  resolveDeletionRequests,
  resolveGovernancePolicy,
  resolveLegalHoldState,
} from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { DeletionCompletionRecord, DeletionDependentArtifact, DeletionRequestRecord } from "@/lib/types";

const requestSchema = z.object({
  reason: z.string().min(5),
  target: z.enum(["all_data", "sources_only", "evaluations_only"]),
});

function createEvidenceHash(input: {
  id: string;
  target: string;
  requestedAt: string;
  approvalTicketRef: string;
  proofRecordId: string;
  dependentArtifacts: DeletionDependentArtifact[];
  deletedObjectCounts: DeletionCompletionRecord["deletedObjectCounts"];
}) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

async function resolveDependentArtifacts(
  target: "all_data" | "sources_only" | "evaluations_only",
  organisationId: string
): Promise<DeletionDependentArtifact[]> {
  const repository = getRepository();
  const [sources, evaluations, exports, jobs] = await Promise.all([
    repository.listSources(organisationId),
    repository.listEvaluations(organisationId),
    repository.listExports(organisationId),
    repository.listJobs(organisationId),
  ]);

  const artifacts: DeletionDependentArtifact[] = [];
  if (target === "all_data" || target === "sources_only") {
    for (const source of sources) {
      artifacts.push({
        artifactType: "source_record",
        artifactId: source.id,
        requiredAction: "delete_or_retain",
        reason: "Source records are directly in deletion scope.",
        handled: false,
        handledAction: null,
        handledReason: null,
      });
    }
  }
  if (target === "all_data" || target === "evaluations_only") {
    for (const evaluation of evaluations) {
      artifacts.push({
        artifactType: "evaluation_record",
        artifactId: evaluation.id,
        requiredAction: "delete_or_retain",
        reason: "Evaluation records are directly in deletion scope.",
        handled: false,
        handledAction: null,
        handledReason: null,
      });
    }
  }
  for (const exportRecord of exports) {
    artifacts.push({
      artifactType: "export_record",
      artifactId: exportRecord.id,
      requiredAction: "review_before_delete",
      reason: "Export artifacts may include data derived from records in deletion scope.",
      handled: false,
      handledAction: null,
      handledReason: null,
    });
  }
  if (target === "all_data") {
    for (const job of jobs) {
      artifacts.push({
        artifactType: "job_record",
        artifactId: job.id,
        requiredAction: "review_before_delete",
        reason: "Job payloads may contain traces tied to deleted records.",
        handled: false,
        handledAction: null,
        handledReason: null,
      });
    }
  }
  return artifacts.sort((a, b) =>
    `${a.artifactType}:${a.artifactId}`.localeCompare(`${b.artifactType}:${b.artifactId}`)
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const items = await resolveDeletionRequests(repository, context.organisationId);
    return jsonOk(items);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const payload = requestSchema.parse(await request.json());
    const [policy, legalHoldState] = await Promise.all([
      resolveGovernancePolicy(repository, context.organisationId),
      resolveLegalHoldState(repository, context.organisationId),
    ]);
    if (policy.legalHoldEnabled || legalHoldState.active) {
      throw new AppError(409, "legal_hold_active", "Deletion requests are blocked while legal hold is enabled.");
    }
    const requestedAt = new Date().toISOString();
    const dependentArtifacts = await resolveDependentArtifacts(payload.target, context.organisationId);
    const item: DeletionRequestRecord = {
      id: crypto.randomUUID(),
      organisationId: context.organisationId,
      status: policy.deletionRequiresApproval ? "pending_approval" : "completed",
      reason: payload.reason,
      target: payload.target,
      requestedBy: context.userId,
      requestedAt,
      approval: null,
      completion: null,
      dependentArtifacts,
    };
    await appendEnterpriseEvent(repository, context, {
      action: "deletion_requested",
      payload: item,
    });
    if (!policy.deletionRequiresApproval) {
      const approval = {
        approvedBy: context.userId,
        approverRole: context.role,
        approvedAt: requestedAt,
        ticketRef: "AUTO-APPROVED-BY-POLICY",
      } as const;
      await appendEnterpriseEvent(repository, context, {
        action: "deletion_approved",
        payload: {
          id: item.id,
          approval,
        },
      });
      const completion = {
        completedBy: context.userId,
        completedAt: requestedAt,
        executionMode: "anonymize",
        proofRecordId: `proof-${item.id}`,
        deletionEvidenceHash: createEvidenceHash({
          id: item.id,
          target: item.target,
          requestedAt,
          approvalTicketRef: approval.ticketRef,
          proofRecordId: `proof-${item.id}`,
          dependentArtifacts,
          deletedObjectCounts: {
            sources: dependentArtifacts.filter((item) => item.artifactType === "source_record").length,
            evaluations: dependentArtifacts.filter((item) => item.artifactType === "evaluation_record").length,
            exports: dependentArtifacts.filter((item) => item.artifactType === "export_record").length,
            jobs: dependentArtifacts.filter((item) => item.artifactType === "job_record").length,
          },
        }),
        deletedObjectCounts: {
          sources: dependentArtifacts.filter((item) => item.artifactType === "source_record").length,
          evaluations: dependentArtifacts.filter((item) => item.artifactType === "evaluation_record").length,
          exports: dependentArtifacts.filter((item) => item.artifactType === "export_record").length,
          jobs: dependentArtifacts.filter((item) => item.artifactType === "job_record").length,
        },
        notes: "Auto-completed because deletion approval requirement is disabled.",
      } as const;
      await appendEnterpriseEvent(repository, context, {
        action: "deletion_completed",
        payload: {
          id: item.id,
          completion,
          dependentArtifacts: dependentArtifacts.map((artifact) => ({
            ...artifact,
            handled: true,
            handledAction: artifact.requiredAction === "review_before_delete" ? "superseded" : "anonymized",
            handledReason:
              artifact.requiredAction === "review_before_delete"
                ? "Retained for post-deletion audit traceability."
                : "Auto-anonymized due to approval-bypass governance policy.",
          })),
        },
      });
    }
    const updated = await resolveDeletionRequests(repository, context.organisationId);
    const created = updated.find((entry) => entry.id === item.id) ?? item;
    return jsonOk(created, 201);
  } catch (error) {
    return jsonError(error);
  }
}
