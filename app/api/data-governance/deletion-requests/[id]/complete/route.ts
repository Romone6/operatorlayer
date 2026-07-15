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
import type { DeletionCompletionRecord, DeletionDependentArtifact } from "@/lib/types";

const completionSchema = z.object({
  approvalTicketRef: z.string().min(3),
  executionMode: z.enum(["soft_delete", "hard_delete", "anonymize"]),
  proofRecordId: z.string().min(6),
  deletedObjectCounts: z.object({
    sources: z.number().int().min(0).default(0),
    evaluations: z.number().int().min(0).default(0),
    exports: z.number().int().min(0).default(0),
    jobs: z.number().int().min(0).default(0),
  }),
  dependentArtifactsHandled: z
    .array(
      z.object({
        artifactType: z.enum(["export_record", "evaluation_record", "source_record", "job_record"]),
        artifactId: z.string().min(3),
        action: z.enum(["deleted", "retained_legal_hold", "anonymized", "superseded", "not_applicable"]),
        reason: z.string().min(5),
      })
    )
    .default([]),
  notes: z.string().min(5).optional(),
});

function createEvidenceHash(input: {
  id: string;
  requestedAt: string;
  approvalTicketRef: string;
  proofRecordId: string;
  executionMode: string;
  dependentArtifactsHandled: Array<{ artifactType: string; artifactId: string; action: string; reason: string }>;
  deletedObjectCounts: DeletionCompletionRecord["deletedObjectCounts"];
}) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const payload = completionSchema.parse(await request.json());
    const { id } = await params;
    const [policy, legalHoldState] = await Promise.all([
      resolveGovernancePolicy(repository, context.organisationId),
      resolveLegalHoldState(repository, context.organisationId),
    ]);
    if (policy.legalHoldEnabled || legalHoldState.active) {
      throw new AppError(409, "legal_hold_active", "Deletion completion is blocked while legal hold is enabled.");
    }
    const requests = await resolveDeletionRequests(repository, context.organisationId);
    const target = requests.find((item) => item.id === id);
    if (!target) throw new AppError(404, "deletion_request_not_found", "Deletion request not found.");
    if (target.status === "completed") {
      throw new AppError(409, "deletion_already_completed", "Deletion request is already completed.");
    }
    const approvalRecord = {
      approvedBy: context.userId,
      approverRole: context.role,
      approvedAt: new Date().toISOString(),
      ticketRef: payload.approvalTicketRef,
    };
    await appendEnterpriseEvent(repository, context, {
      action: "deletion_approved",
      payload: {
        id,
        approval: approvalRecord,
      },
    });
    const handledById = new Map(
      payload.dependentArtifactsHandled.map((item) => [`${item.artifactType}:${item.artifactId}`, item])
    );
    const dependentArtifacts: DeletionDependentArtifact[] = target.dependentArtifacts.map((artifact) => {
      const match = handledById.get(`${artifact.artifactType}:${artifact.artifactId}`);
      if (!match) return artifact;
      return {
        ...artifact,
        handled: true,
        handledAction: match.action,
        handledReason: match.reason,
      };
    });
    const completionRecord: DeletionCompletionRecord = {
      completedBy: context.userId,
      completedAt: new Date().toISOString(),
      executionMode: payload.executionMode,
      proofRecordId: payload.proofRecordId,
      deletionEvidenceHash: createEvidenceHash({
        id,
        requestedAt: target.requestedAt,
        approvalTicketRef: payload.approvalTicketRef,
        proofRecordId: payload.proofRecordId,
        executionMode: payload.executionMode,
        dependentArtifactsHandled: payload.dependentArtifactsHandled,
        deletedObjectCounts: payload.deletedObjectCounts,
      }),
      deletedObjectCounts: payload.deletedObjectCounts,
      notes: payload.notes ?? null,
    };
    await appendEnterpriseEvent(repository, context, {
      action: "deletion_completed",
      payload: {
        id,
        completion: completionRecord,
        dependentArtifacts,
      },
    });
    const updated = await resolveDeletionRequests(repository, context.organisationId);
    const response = updated.find((item) => item.id === id);
    if (!response) throw new AppError(500, "deletion_request_resolution_failed", "Unable to resolve deletion request.");
    return jsonOk(response);
  } catch (error) {
    return jsonError(error);
  }
}
