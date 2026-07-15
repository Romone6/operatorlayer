import type { RequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import type { AdminCapability, AppRole } from "@/lib/types";

export function assertRole(context: RequestContext, allowedRoles: AppRole[]) {
  const role = String(context.role ?? "member").toLowerCase() as AppRole;
  if (!allowedRoles.includes(role)) {
    throw new AppError(403, "forbidden", "You do not have permission to perform this action.", {
      role,
      allowedRoles,
    });
  }
}

export function assertCapability(context: RequestContext, requiredCapability: AdminCapability) {
  const capabilities = Array.isArray(context.capabilities) ? context.capabilities : [];
  if (!capabilities.includes(requiredCapability)) {
    throw new AppError(403, "capability_forbidden", "Missing required capability for this action.", {
      role: context.role,
      requiredCapability,
      capabilities,
    });
  }
}
