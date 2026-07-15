import { NextRequest } from "next/server";
import { z } from "zod";

import { getAuthenticatedUser } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

const createOrganisationSchema = z.object({
  name: z.string().min(2),
  industry: z.string().optional(),
  userName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const body = createOrganisationSchema.parse(await request.json());
    const repository = getRepository();

    const organisation = await repository.createOrganisation({
      name: body.name,
      industry: body.industry,
      email: authUser.email ?? "unknown@example.com",
      userName: body.userName,
      userId: authUser.userId,
    });

    return jsonOk(organisation, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid payload", error.flatten()));
    }
    return jsonError(error);
  }
}
