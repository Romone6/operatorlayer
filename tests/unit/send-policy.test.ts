import { describe, expect, it, beforeEach } from "vitest";

import { decideAutoSend } from "@/lib/enterprise/send-policy";
import { appendEnterpriseEvent } from "@/lib/enterprise/store";
import { MemoryRepository, resetMemoryRepository } from "@/lib/repository/memory";

describe("decideAutoSend", () => {
  beforeEach(() => {
    resetMemoryRepository();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-supabase-anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-supabase-service-role";
  });

  it("allows low-risk auto-send when flag, entitlement, and rule all match", async () => {
    const repository = new MemoryRepository();
    const organisation = await repository.createOrganisation({
      name: "Send Policy Org",
      industry: "SaaS",
      userId: "user-1",
      email: "owner@example.com",
    });
    const context = {
      organisationId: organisation.id,
      userId: "user-1",
      role: "owner" as const,
      email: "owner@example.com",
    };
    await appendEnterpriseEvent(repository, context, {
      action: "feature_flag_upsert",
      payload: {
        key: "auto_send",
        enabled: true,
        rolloutPercent: 100,
        updatedBy: "user-1",
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "billing_entitlement_upsert",
      payload: {
        organisationId: organisation.id,
        plan: "enterprise",
        seatsLimit: 9999,
        evaluationsMonthlyLimit: 100000,
        sourcesMonthlyLimit: 10000,
        connectorLimit: 50,
        autoSendEnabled: true,
        apiAccessEnabled: true,
        mcpAccessEnabled: true,
        status: "active",
        updatedAt: new Date().toISOString(),
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "approval_rule_upsert",
      payload: {
        id: "rule-1",
        organisationId: organisation.id,
        name: "Low risk email",
        scenario: "pricing_objection",
        minScore: 90,
        riskLevels: ["low"],
        channelAllowlist: ["email"],
        customerTypeAllowlist: ["smb"],
        requiresHumanApproval: false,
        enabled: true,
        createdBy: "user-1",
        updatedBy: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const decision = await decideAutoSend(repository, {
      organisationId: organisation.id,
      score: 95,
      riskLevel: "low",
      channel: "email",
      customerType: "smb",
    });
    expect(decision.allowed).toBe(true);
    expect(decision.state).toBe("allowed");
    expect(decision.approvalDecision.status).toBe("approved");
  });

  it("blocks auto-send when global kill switch is active", async () => {
    const repository = new MemoryRepository();
    const organisation = await repository.createOrganisation({
      name: "Send Policy Kill Switch Org",
      industry: "SaaS",
      userId: "user-1",
      email: "owner@example.com",
    });
    const context = {
      organisationId: organisation.id,
      userId: "user-1",
      role: "owner" as const,
      email: "owner@example.com",
    };
    await appendEnterpriseEvent(repository, context, {
      action: "feature_flag_upsert",
      payload: {
        key: "auto_send",
        enabled: true,
        rolloutPercent: 100,
        updatedBy: "user-1",
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "billing_entitlement_upsert",
      payload: {
        organisationId: organisation.id,
        plan: "enterprise",
        seatsLimit: 9999,
        evaluationsMonthlyLimit: 100000,
        sourcesMonthlyLimit: 10000,
        connectorLimit: 50,
        autoSendEnabled: true,
        apiAccessEnabled: true,
        mcpAccessEnabled: true,
        status: "active",
        updatedAt: new Date().toISOString(),
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "approval_rule_upsert",
      payload: {
        id: "rule-1",
        organisationId: organisation.id,
        name: "Low risk email",
        scenario: "pricing_objection",
        minScore: 90,
        riskLevels: ["low"],
        channelAllowlist: ["email"],
        customerTypeAllowlist: ["smb"],
        requiresHumanApproval: false,
        enabled: true,
        createdBy: "user-1",
        updatedBy: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    await appendEnterpriseEvent(repository, context, {
      action: "auto_send_kill_switch_upsert",
      payload: {
        scope: "global",
        active: true,
        reason: "incident containment",
      },
    });

    const decision = await decideAutoSend(repository, {
      organisationId: organisation.id,
      score: 96,
      riskLevel: "low",
      channel: "email",
      customerType: "smb",
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("Global auto-send kill switch active");
  });
});
