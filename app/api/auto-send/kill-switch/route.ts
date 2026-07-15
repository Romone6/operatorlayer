import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import {
  appendEnterpriseEvent,
  resolveAutoSendKillSwitchState,
} from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { autoSendKillSwitchPatchSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const state = await resolveAutoSendKillSwitchState(repository, context.organisationId);
    return jsonOk(state);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const payload = autoSendKillSwitchPatchSchema.parse(await request.json());

    await appendEnterpriseEvent(repository, context, {
      action: "auto_send_kill_switch_upsert",
      payload: {
        scope: payload.scope,
        workspaceId: payload.scope === "workspace" ? payload.workspaceId : null,
        active: payload.active,
        reason: payload.reason,
        updatedAt: new Date().toISOString(),
      },
    });

    const state = await resolveAutoSendKillSwitchState(repository, context.organisationId);
    return jsonOk(state);
  } catch (error) {
    return jsonError(error);
  }
}
