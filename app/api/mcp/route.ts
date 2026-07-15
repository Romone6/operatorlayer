import { NextRequest } from "next/server";
import { z } from "zod";

import { assertMcpActionsAvailable } from "@/lib/enterprise/mcp-availability";
import { mcpCapabilities, resolveApiCredentialByRawKey } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import {
  evaluateAndRepairDraft,
  evaluateDraft,
  generateScenarioGuidance,
} from "@/lib/services/playground";
import {
  mcpDraftEvaluateInputSchema,
  mcpDraftRepairInputSchema,
  mcpInvocationSchema,
  mcpPolicyPackFetchInputSchema,
} from "@/lib/validation";

function getExternalAuth(request: NextRequest) {
  const apiKey = request.headers.get("x-ol-api-key");
  const organisationId = request.headers.get("x-ol-org-id");
  if (!apiKey || !organisationId) {
    throw new AppError(401, "api_key_missing", "x-ol-api-key and x-ol-org-id headers are required.");
  }
  return { apiKey, organisationId };
}

function hasScope(scopes: string[], requiredScope: string | null) {
  if (!requiredScope) return true;
  return scopes.includes(requiredScope) || scopes.includes("*") || scopes.includes("mcp:*");
}

async function appendMcpInvocationEvent(input: {
  organisationId: string;
  actorId: string;
  toolId: string;
  status: "succeeded" | "failed";
  credentialId?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  const repository = getRepository();
  return repository.createIngestionLog({
    organisationId: input.organisationId,
    sourceId: null,
    action: "enterprise:mcp_tool_invocation",
    details: {
      toolId: input.toolId,
      status: input.status,
      credentialId: input.credentialId,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      actorId: input.actorId,
    },
  });
}

async function executeTool(input: {
  toolId: "policy_pack.fetch" | "draft.evaluate" | "draft.repair";
  toolInput: Record<string, unknown>;
  organisationId: string;
}) {
  const repository = getRepository();

  if (input.toolId === "policy_pack.fetch") {
    const parsed = mcpPolicyPackFetchInputSchema.parse(input.toolInput);
    const exports = await repository.listExports(input.organisationId);
    const record = parsed.exportId
      ? exports.find((item) => item.id === parsed.exportId)
      : [...exports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!record) {
      throw new AppError(404, "mcp_policy_pack_not_found", "No policy pack export is available for this organisation.");
    }
    return {
      export: record,
      manifest: record.manifest,
      artifacts: record.artifacts,
    };
  }

  if (input.toolId === "draft.evaluate") {
    const parsed = mcpDraftEvaluateInputSchema.parse(input.toolInput);
    const guidance = await generateScenarioGuidance(
      repository,
      input.organisationId,
      parsed.inputMessage
    );
    const policies = await repository.listPolicies(input.organisationId);
    const evaluation = await evaluateDraft({
      draft: parsed.draft,
      guidance,
      policies,
    });
    return { guidance, evaluation };
  }

  const parsed = mcpDraftRepairInputSchema.parse(input.toolInput);
  return evaluateAndRepairDraft({
    repository,
    organisationId: input.organisationId,
    inputMessage: parsed.inputMessage,
    channel: parsed.channel,
    team: parsed.team,
    customerType: parsed.customerType,
    context: parsed.context,
    draft: parsed.draft,
  });
}

export async function POST(request: NextRequest) {
  let organisationId: string | null = null;
  let actorId = "api_key:unknown";
  let credentialId: string | undefined;
  let toolId = "unknown";

  try {
    const repository = getRepository();
    const auth = getExternalAuth(request);
    organisationId = auth.organisationId;
    const credential = await resolveApiCredentialByRawKey(repository, organisationId, auth.apiKey);
    if (!credential) {
      throw new AppError(401, "api_key_invalid", "API key is invalid or revoked.");
    }
    credentialId = credential.id;
    actorId = `api_key:${credential.id}`;

    const payload = mcpInvocationSchema.parse(await request.json());
    toolId = payload.toolId;
    await assertMcpActionsAvailable(repository, organisationId, {
      actorId,
      surface: "mcp_invoke",
    });

    const capability = mcpCapabilities.find((item) => item.id === payload.toolId);
    if (!capability) {
      throw new AppError(404, "mcp_tool_not_found", "MCP tool is not supported.", { toolId: payload.toolId });
    }
    if (!hasScope(credential.scopes, capability.requiredScope)) {
      throw new AppError(403, "mcp_scope_forbidden", "Credential does not grant the required MCP tool scope.", {
        toolId: payload.toolId,
        requiredScope: capability.requiredScope,
      });
    }

    const result = await executeTool({
      toolId: payload.toolId,
      toolInput: payload.input,
      organisationId,
    });
    const audit = await appendMcpInvocationEvent({
      organisationId,
      actorId,
      credentialId,
      toolId,
      status: "succeeded",
    });
    return jsonOk({
      toolId,
      invocationId: audit.id,
      result,
    });
  } catch (error) {
    if (organisationId && toolId !== "unknown") {
      await appendMcpInvocationEvent({
        organisationId,
        actorId,
        credentialId,
        toolId,
        status: "failed",
        errorCode: error instanceof AppError ? error.code : error instanceof z.ZodError ? "invalid_payload" : "internal_error",
        errorMessage: error instanceof Error ? error.message : "Unexpected MCP invocation failure.",
      }).catch(() => undefined);
    }
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid MCP invocation payload.", error.flatten()));
    }
    return jsonError(error);
  }
}
