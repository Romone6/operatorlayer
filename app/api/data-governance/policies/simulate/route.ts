import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { simulateGovernancePolicy } from "@/lib/enterprise/governance-simulation";
import {
  appendEnterpriseEvent,
  resolveDeletionRequests,
  resolveGovernancePolicy,
  resolveSsoConfig,
} from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const policyPatchSchema = z.object({
  retentionDays: z.number().int().min(7).max(3650),
  legalHoldEnabled: z.boolean(),
  deletionRequiresApproval: z.boolean(),
  invitePolicy: z.enum(["open", "domain_allowlist_only", "disabled"]),
  sessionDurationMinutes: z.number().int().min(15).max(43200),
  enforcedMfa: z.boolean(),
  breakGlassAdminEnabled: z.boolean(),
});

const simulationSchema = z.object({
  proposedPolicy: policyPatchSchema.partial().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");

    const payload = simulationSchema.parse(await request.json());
    const repository = getRepository();

    const [currentPolicy, sources, jobs, deletions, ssoConfig] = await Promise.all([
      resolveGovernancePolicy(repository, context.organisationId),
      repository.listSources(context.organisationId),
      repository.listJobs(context.organisationId),
      resolveDeletionRequests(repository, context.organisationId),
      resolveSsoConfig(repository, context.organisationId),
    ]);

    const proposedPolicy = {
      ...currentPolicy,
      ...(payload.proposedPolicy ?? {}),
      updatedAt: currentPolicy.updatedAt,
    };

    const pendingDeletionRequests = deletions.filter(
      (item) => String(item.status ?? "") !== "completed"
    ).length;
    const queueFailures = jobs.filter((job) => job.status === "failed").length;
    const queueDeadLetter = jobs.filter((job) => job.status === "dead_letter").length;

    const simulation = simulateGovernancePolicy({
      currentPolicy,
      proposedPolicy,
      sourceCount: sources.length,
      pendingDeletionRequests,
      queueFailures,
      queueDeadLetter,
      ssoDomainAllowlistCount: ssoConfig.domainAllowlist.length,
    });

    await appendEnterpriseEvent(repository, context, {
      action: "governance_policy_simulated",
      payload: {
        status: simulation.status,
        warningCodes: simulation.warnings.map((item) => item.code),
        blockedActionCodes: simulation.blockedActions.map((item) => item.code),
        impact: simulation.impact,
      },
    });

    return jsonOk(simulation);
  } catch (error) {
    return jsonError(error);
  }
}
