import crypto from "node:crypto";

import { NextRequest } from "next/server";
import { z } from "zod";

import { assertCapability, assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { appendEnterpriseEvent, resolveLegalHoldState } from "@/lib/enterprise/store";

const placeLegalHoldSchema = z.object({
  scope: z.enum(["global", "sources", "evaluations", "exports"]).default("global"),
  reason: z.string().min(8),
  ticketRef: z.string().min(3),
  durationHours: z.number().int().min(1).max(24 * 180).optional(),
});

const releaseLegalHoldSchema = z.object({
  action: z.enum(["release", "override"]),
  reason: z.string().min(8),
  ticketRef: z.string().min(3),
  holdId: z.string().min(3).optional(),
});

function toExpiryIso(durationHours?: number) {
  if (!durationHours) return null;
  return new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin"]);
    assertCapability(context, "compliance-admin");
    const repository = getRepository();
    const state = await resolveLegalHoldState(repository, context.organisationId);
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
    const payload = placeLegalHoldSchema.parse(await request.json());
    const state = await resolveLegalHoldState(repository, context.organisationId);
    if (state.active) {
      throw new AppError(
        409,
        "legal_hold_already_active",
        "A legal hold is already active and must be released or overridden first.",
        {
          holdId: state.active.holdId,
          scope: state.active.scope,
          placedAt: state.active.placedAt,
        }
      );
    }
    const holdId = crypto.randomUUID();
    await appendEnterpriseEvent(repository, context, {
      action: "legal_hold_placed",
      payload: {
        holdId,
        scope: payload.scope,
        reason: payload.reason,
        ticketRef: payload.ticketRef,
        expiresAt: toExpiryIso(payload.durationHours),
      },
    });
    const updated = await resolveLegalHoldState(repository, context.organisationId);
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
    const payload = releaseLegalHoldSchema.parse(await request.json());
    const state = await resolveLegalHoldState(repository, context.organisationId);
    const target = payload.holdId
      ? state.history.find((item) => item.holdId === payload.holdId && item.status === "active")
      : state.active;

    if (!target) {
      throw new AppError(409, "legal_hold_not_active", "No active legal hold matched this request.");
    }

    await appendEnterpriseEvent(repository, context, {
      action: payload.action === "override" ? "legal_hold_overridden" : "legal_hold_released",
      payload: {
        holdId: target.holdId,
        reason: payload.reason,
        ticketRef: payload.ticketRef,
      },
    });
    const updated = await resolveLegalHoldState(repository, context.organisationId);
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error);
  }
}
