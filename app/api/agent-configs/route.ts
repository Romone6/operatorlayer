import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { appendEnterpriseEvent, resolveAgentGovernanceConfigs } from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { AgentGovernanceConfig } from "@/lib/types";
import { agentGovernanceConfigSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const repository = getRepository();
    const configs = await resolveAgentGovernanceConfigs(repository, context.organisationId);
    return jsonOk(configs);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    const repository = getRepository();
    const payload = agentGovernanceConfigSchema.parse(await request.json());
    const existing = (await resolveAgentGovernanceConfigs(repository, context.organisationId)).find(
      (item) =>
        item.agentId === payload.agentId &&
        item.channel === payload.channel &&
        item.useCase === payload.useCase &&
        item.customerSegment === payload.customerSegment
    );
    const now = new Date().toISOString();
    const config: AgentGovernanceConfig = {
      id: existing?.id ?? crypto.randomUUID(),
      organisationId: context.organisationId,
      ...payload,
      createdBy: existing?.createdBy ?? context.userId,
      updatedBy: context.userId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await appendEnterpriseEvent(repository, context, {
      action: "agent_governance_config_upsert",
      payload: config,
    });
    return jsonOk(config, existing ? 200 : 201);
  } catch (error) {
    return jsonError(error);
  }
}
