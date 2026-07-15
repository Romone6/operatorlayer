import { NextRequest } from "next/server";

import { PATCH as patchRule } from "@/app/api/approval-rules/[id]/route";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return patchRule(request, context);
}

