import { NextRequest } from "next/server";

import { assertScimConfigured } from "@/lib/enterprise/config";
import { assertScimWriteAvailable } from "@/lib/enterprise/scim-availability";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import type { AppRole } from "@/lib/types";
import { scimProvisionSchema } from "@/lib/validation";

function assertScimToken(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== process.env.OPERATORLAYER_SCIM_TOKEN) {
    throw new AppError(401, "scim_unauthorized", "Invalid SCIM bearer token.");
  }
}

export async function POST(request: NextRequest) {
  try {
    assertScimConfigured();
    assertScimToken(request);
    const organisationId = request.headers.get("x-ol-org-id");
    if (!organisationId) {
      throw new AppError(400, "scim_org_missing", "x-ol-org-id header is required.");
    }
    const repository = getRepository();
    await assertScimWriteAvailable(repository, organisationId, {
      actorId: "scim",
      surface: "scim_provision",
    });
    const payload = scimProvisionSchema.parse(await request.json());
    if (payload.action !== "deprovision_user" && !payload.role) {
      throw new AppError(400, "scim_role_required", "Role is required for SCIM provision and update actions.");
    }
    const scimContext = {
      organisationId,
      userId: "scim",
      role: "admin" as const,
      email: "scim@system.local",
    };

    if (payload.action !== "deprovision_user") {
      await repository.upsertUserMembership({
        organisationId,
        userId: payload.userId,
        email: payload.email ?? `${payload.userId}@example.com`,
        role: payload.role! as AppRole,
      });
      await appendEnterpriseEvent(repository, scimContext, {
        action: "scim_user_status_set",
        payload: {
          userId: payload.userId,
          active: true,
          reason: payload.action === "update_role" ? "role_update" : "provisioned",
        },
      });
    }
    if (payload.action === "deprovision_user") {
      await repository.updateUserRole(organisationId, payload.userId, "member");
      await appendEnterpriseEvent(repository, scimContext, {
        action: "scim_user_status_set",
        payload: {
          userId: payload.userId,
          active: false,
          reason: "deprovisioned",
        },
      });
    }
    return jsonOk({
      action: payload.action,
      userId: payload.userId,
      status: "applied",
      active: payload.action !== "deprovision_user",
    });
  } catch (error) {
    return jsonError(error);
  }
}
