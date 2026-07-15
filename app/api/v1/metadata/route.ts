import { NextRequest } from "next/server";

import { jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  void request;
  return jsonOk({
    version: "v1",
    releasedAt: "2026-05-09",
    deprecationPolicy: "Breaking changes require a new /api/v{n} path and migration window.",
    endpoints: ["/api/v1/evaluations"],
  });
}
