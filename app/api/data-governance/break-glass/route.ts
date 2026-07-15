import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import {
  appendEnterpriseEvent,
  resolveBreakGlassProtocolState,
  resolveGovernancePolicy,
} from "@/lib/enterprise/store";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { breakGlassInvokeSchema, breakGlassReleaseSchema } from "@/lib/validation";

function toExpiryIso(durationMinutes: number) {
  return new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const state = await resolveBreakGlassProtocolState(repository, context.organisationId);
    return jsonOk(state);
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
    const payload = breakGlassInvokeSchema.parse(await request.json());
    const policy = await resolveGovernancePolicy(repository, context.organisationId);
    if (!policy.breakGlassAdminEnabled) {
      throw new AppError(
        409,
        "break_glass_disabled",
        "Break-glass protocol is disabled by governance policy."
      );
    }

    const state = await resolveBreakGlassProtocolState(repository, context.organisationId);
    if (state.active) {
      throw new AppError(
        409,
        "break_glass_already_active",
        "Break-glass protocol is already active and must be released before reinvocation.",
        {
          invocationId: state.active.invocationId,
          expiresAt: state.active.expiresAt,
        }
      );
    }

    const invocationId = randomUUID();
    await appendEnterpriseEvent(repository, context, {
      action: "break_glass_invoked",
      payload: {
        invocationId,
        reason: payload.reason,
        ticketRef: payload.ticketRef ?? null,
        durationMinutes: payload.durationMinutes,
        expiresAt: toExpiryIso(payload.durationMinutes),
      },
    });
    const updated = await resolveBreakGlassProtocolState(repository, context.organisationId);
    return jsonOk(updated, 201);
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
    const payload = breakGlassReleaseSchema.parse(await request.json());
    const state = await resolveBreakGlassProtocolState(repository, context.organisationId);

    if (!state.active) {
      throw new AppError(
        409,
        "break_glass_not_active",
        "Break-glass protocol is not active for this organisation."
      );
    }

    await appendEnterpriseEvent(repository, context, {
      action: "break_glass_released",
      payload: {
        invocationId: state.active.invocationId,
        reason: payload.reason,
      },
    });

    const updated = await resolveBreakGlassProtocolState(repository, context.organisationId);
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
