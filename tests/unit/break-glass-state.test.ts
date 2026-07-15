import { beforeEach, describe, expect, it } from "vitest";

import {
  appendEnterpriseEvent,
  resolveBreakGlassProtocolState,
} from "@/lib/enterprise/store";
import { getRepository } from "@/lib/repository";
import { resetMemoryRepository } from "@/lib/repository/memory";

async function createOrg() {
  const repository = getRepository();
  const organisation = await repository.createOrganisation({
    name: "Break Glass Unit Org",
    industry: "SaaS",
    userId: "unit-user-break-glass-001",
    email: "owner@example.com",
  });
  return {
    repository,
    context: {
      userId: "unit-user-break-glass-001",
      organisationId: organisation.id,
      role: "owner" as const,
      capabilities: ["compliance-admin", "connector-admin", "billing-admin", "api-admin"],
      email: "owner@example.com",
    },
  };
}

describe("resolveBreakGlassProtocolState", () => {
  beforeEach(() => {
    resetMemoryRepository();
  });

  it("marks stale active invocations as expired", async () => {
    const { repository, context } = await createOrg();
    await appendEnterpriseEvent(repository, context, {
      action: "break_glass_invoked",
      payload: {
        invocationId: "bg-expired-001",
        reason: "Expired emergency invocation for test coverage.",
        durationMinutes: 5,
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });

    const state = await resolveBreakGlassProtocolState(repository, context.organisationId);
    expect(state.active).toBeNull();
    expect(state.history.length).toBe(1);
    expect(state.history[0]?.status).toBe("expired");
  });

  it("returns released state after release event is appended", async () => {
    const { repository, context } = await createOrg();
    await appendEnterpriseEvent(repository, context, {
      action: "break_glass_invoked",
      payload: {
        invocationId: "bg-release-001",
        reason: "Emergency invocation pending release.",
        durationMinutes: 30,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "break_glass_released",
      payload: {
        invocationId: "bg-release-001",
        reason: "Release completed after mitigation.",
      },
    });

    const state = await resolveBreakGlassProtocolState(repository, context.organisationId);
    expect(state.active).toBeNull();
    expect(state.history[0]?.status).toBe("released");
    expect(state.history[0]?.releaseReason).toContain("Release completed");
    expect(state.history[0]?.releasedBy).toBe(context.userId);
  });
});
