import { NextRequest } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { contactFormSchema } from "@/lib/validators/forms";

const contactPayloadSchema = contactFormSchema.extend({
  source: z.string().min(2).default("marketing_contact_page"),
});

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const rateKey = `contact:${getClientKey(request)}`;
    const rate = checkRateLimit(rateKey, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!rate.allowed) {
      throw new AppError(429, "rate_limited", "Too many submissions. Try again shortly.", {
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }

    const body = contactPayloadSchema.parse(await request.json());
    const repository = getRepository();
    const saved = await repository.createContactSubmission({
      name: body.name,
      workEmail: body.workEmail,
      company: body.company,
      role: body.role,
      companySize: body.companySize,
      currentAiTools: body.currentAiTools,
      primaryUseCase: body.primaryUseCase,
      message: body.message,
      source: body.source,
    });

    return jsonOk(
      {
        id: saved.id,
        createdAt: saved.createdAt,
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(new AppError(400, "invalid_payload", "Invalid contact payload", error.flatten()));
    }
    return jsonError(error);
  }
}
