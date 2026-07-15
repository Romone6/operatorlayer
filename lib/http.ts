import { NextResponse } from "next/server";

import { AppError, asAppError, isRecoverableError, statusCodeToSeverity } from "@/lib/errors";
import type { ApiErrorEnvelope } from "@/lib/types";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

function makeTraceId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function jsonError(error: unknown) {
  const appError = asAppError(error);
  const traceId = makeTraceId();
  const payload: ApiErrorEnvelope = {
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      severity: statusCodeToSeverity(appError.statusCode),
      recoverable: isRecoverableError(appError.statusCode),
      traceId,
    },
  };
  const response = NextResponse.json(
    payload,
    { status: appError.statusCode }
  );
  response.headers.set("x-operatorlayer-trace-id", traceId);
  return response;
}

export function assertCondition(condition: unknown, statusCode: number, code: string, message: string) {
  if (!condition) {
    throw new AppError(statusCode, code, message);
  }
}
