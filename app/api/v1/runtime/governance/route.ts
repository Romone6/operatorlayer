import { NextRequest } from "next/server";

import {
  resolveAgentGovernanceConfig,
  resolveApiCredentialByRawKey,
} from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { routeRuntimeNotification } from "@/lib/services/notifications";
import { runRuntimeGovernanceDecision } from "@/lib/services/runtime-governance";
import { runtimeGovernanceDecisionSchema } from "@/lib/validation";

function getExternalAuth(request: NextRequest) {
  const apiKey = request.headers.get("x-ol-api-key");
  const organisationId = request.headers.get("x-ol-org-id");
  if (!apiKey || !organisationId) {
    throw new AppError(401, "api_key_missing", "x-ol-api-key and x-ol-org-id headers are required.");
  }
  return { apiKey, organisationId };
}

function hasScope(scopes: string[], requiredScope: string) {
  return scopes.includes(requiredScope) || scopes.includes("*") || scopes.includes("runtime:*");
}

export async function POST(request: NextRequest) {
  try {
    const repository = getRepository();
    const { apiKey, organisationId } = getExternalAuth(request);
    const credential = await resolveApiCredentialByRawKey(repository, organisationId, apiKey);
    if (!credential) {
      throw new AppError(401, "api_key_invalid", "API key is invalid or revoked.");
    }
    if (!hasScope(credential.scopes, "runtime.invoke")) {
      throw new AppError(403, "api_scope_forbidden", "Credential does not grant runtime.invoke scope.");
    }

    const payload = runtimeGovernanceDecisionSchema.parse(await request.json());
    const agentConfig = await resolveAgentGovernanceConfig(repository, organisationId, {
      agentId: payload.agentId,
      channel: payload.channel,
      useCase: payload.useCase,
      customerSegment: payload.customerSegment,
    });
    const governanceMode = agentConfig?.governanceMode ?? payload.governanceMode;
    if (!governanceMode) {
      throw new AppError(
        409,
        "runtime_agent_config_missing",
        "No matching agent governance config exists and no governanceMode was supplied."
      );
    }
    const result = await runRuntimeGovernanceDecision(repository, {
      organisationId,
      actorId: `api_key:${credential.id}`,
      credentialId: credential.id,
      agentId: payload.agentId,
      channel: payload.channel,
      useCase: payload.useCase,
      customerSegment: payload.customerSegment,
      governanceMode,
      inputMessage: payload.inputMessage,
      draft: payload.draft,
      workspaceId: payload.workspaceId,
      policyPackId: payload.policyPackId,
      scoreThreshold: agentConfig?.scoreThreshold ?? payload.scoreThreshold,
      riskLevel: payload.riskLevel ?? agentConfig?.riskLevels[0],
      notificationDestinations:
        agentConfig?.notificationDestinations ?? payload.notificationDestinations,
    });
    const notificationRouting = await routeRuntimeNotification({
      repository,
      organisationId,
      actorId: `api_key:${credential.id}`,
      decisionId: result.decisionId,
      evaluationId: result.evaluationRecord.id,
      policyPackId: result.policyPack?.id ?? null,
      notificationIntent: result.notificationIntent,
      metadata: {
        agentId: payload.agentId,
        channel: payload.channel,
        useCase: payload.useCase,
        customerSegment: payload.customerSegment,
        governanceMode,
        decisionStatus: result.decision.status,
      },
    });

    return jsonOk({
      ...result,
      notificationRouting,
      agentConfig: agentConfig
        ? {
            id: agentConfig.id,
            source: "persisted",
            governanceMode: agentConfig.governanceMode,
            scoreThreshold: agentConfig.scoreThreshold,
          }
        : {
            id: null,
            source: "request",
            governanceMode,
            scoreThreshold: payload.scoreThreshold,
          },
      credential: {
        id: credential.id,
        name: credential.name,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
