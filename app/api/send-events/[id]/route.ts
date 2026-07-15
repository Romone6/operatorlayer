import { NextRequest } from "next/server";

import { assertRole } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/context";
import { resolveSendEvents } from "@/lib/enterprise/store";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext(request);
    assertRole(context, ["owner", "admin", "reviewer", "analyst"]);
    const repository = getRepository();
    const { id } = await params;
    const events = await resolveSendEvents(repository, context.organisationId);
    const record = events.find((item) => item.id === id);
    if (!record) {
      throw new AppError(404, "send_event_not_found", "Send event not found.");
    }
    return jsonOk(record);
  } catch (error) {
    return jsonError(error);
  }
}

