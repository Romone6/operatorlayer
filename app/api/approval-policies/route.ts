import { NextRequest } from "next/server";

import { GET as getRules, POST as postRule } from "@/app/api/approval-rules/route";

export async function GET(request: NextRequest) {
  return getRules(request);
}

export async function POST(request: NextRequest) {
  return postRule(request);
}

