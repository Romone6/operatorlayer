import { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";

export function assertScimAuth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== process.env.OPERATORLAYER_SCIM_TOKEN) {
    throw new AppError(401, "scim_unauthorized", "Invalid SCIM bearer token.");
  }
  const organisationId = request.headers.get("x-ol-org-id");
  if (!organisationId) {
    throw new AppError(400, "scim_org_missing", "x-ol-org-id header is required.");
  }
  return organisationId;
}

export function scimListResponse(resources: unknown[]) {
  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: resources.length,
    startIndex: 1,
    itemsPerPage: resources.length,
    Resources: resources,
  };
}
