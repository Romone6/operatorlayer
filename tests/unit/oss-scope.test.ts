import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");

describe("open-source core scope", () => {
  it("does not ship enterprise delivery or identity-provider routes", () => {
    for (const relativePath of [
      "app/api/auto-send/decide/route.ts",
      "app/api/billing/usage/route.ts",
      "app/api/connectors/route.ts",
      "app/api/mcp/route.ts",
      "app/api/saml/login/route.ts",
      "app/api/scim/provision/route.ts",
      "app/api/send-events/route.ts",
      "app/api/sso/config/route.ts",
    ]) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(false);
    }
  });

  it("limits generated exports to the documented core artifacts", () => {
    const source = fs.readFileSync(path.join(root, "lib/services/playground.ts"), "utf8");
    const artifactNames = [
      "company_voice.md",
      "communication_policy.json",
      "scenario_playbooks.json",
      "phrase_library.json",
      "forbidden_phrases.json",
      "approval_rules.json",
      "evaluation_rubric.json",
      "approved_examples.jsonl",
      "rejected_examples.jsonl",
      "agent_prompt_pack.md",
      "policy_version_manifest.json",
    ];

    for (const artifactName of artifactNames) {
      expect(source).toContain(artifactName);
    }
    for (const removedArtifact of [
      "company_identity.json",
      "knowledge_pack.json",
      "sales_positioning_pack.json",
      "support_resolution_pack.json",
      "escalation_hierarchy.json",
      "agent_permissions.json",
      "runtime_governance_policy.json",
      "test_suite_manifest.json",
      "agent_alignment_report.json",
    ]) {
      expect(source).not.toContain(removedArtifact);
    }
  });

  it("does not present the legacy product name on public routes", () => {
    for (const relativePath of [
      "README.md",
      "CONTRIBUTING.md",
      "LICENSE",
      "app/layout.tsx",
      "app/(marketing)/about/page.tsx",
      "app/(marketing)/contact/page.tsx",
      "app/(marketing)/docs/page.tsx",
      "app/(marketing)/integrations/page.tsx",
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/product/page.tsx",
      "app/(marketing)/security/page.tsx",
      "app/(marketing)/solutions/page.tsx",
      "components/app/app-sidebar.tsx",
      "components/marketing/brand.tsx",
      "components/marketing/footer.tsx",
      "docs/CAPABILITY_LEDGER.md",
      "docs/DEPLOYMENT.md",
      "docs/RELEASING.md",
    ]) {
      expect(fs.readFileSync(path.join(root, relativePath), "utf8")).not.toContain("OperatorLayer");
    }
  });

  it("keeps local Supabase state and vulnerability reports out of public contribution flow", () => {
    const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
    const security = fs.readFileSync(path.join(root, "SECURITY.md"), "utf8");

    expect(gitignore).toContain("supabase/.branches/");
    expect(gitignore).toContain("supabase/.temp/");
    expect(security).toContain("private vulnerability reporting");
    expect(security).toContain("Do not open public issues");
  });
});
