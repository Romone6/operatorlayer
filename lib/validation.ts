import { z } from "zod";

export const structuredPolicySchema = z.object({
  rule_id: z.string().min(3),
  rule_type: z.string().min(3),
  scenario: z.string().min(3),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["suggested", "approved", "rejected", "needs_review", "outdated"]),
  rule: z.string().min(20),
  required_sequence: z.array(z.string().min(3)).min(2),
  approved_phrases: z.array(z.string().min(3)).min(1),
  forbidden_phrases: z.array(z.string().min(3)).min(1),
  human_review_conditions: z.array(z.string().min(3)).min(1),
  confidence: z.number().min(0).max(1),
});

export const scenarioSchema = z.object({
  name: z.string().min(3),
  category: z.string().min(3),
  description: z.string().min(10),
  risk_level: z.string().min(3),
  trigger_phrases: z.array(z.string().min(3)).min(1),
  response_flow: z.array(z.string().min(3)).min(2),
  approved_terminology: z.array(z.string().min(3)).min(1),
  forbidden_terminology: z.array(z.string().min(3)).min(1),
  examples: z.array(z.string().min(8)).min(1),
  bad_examples: z.array(z.string().min(8)).min(1),
  approval_rules: z.array(z.string().min(6)).min(1),
  evaluation_rubric: z.record(z.string(), z.number().min(0).max(100)),
});

export const conflictSchema = z.object({
  conflict_type: z.string().min(3),
  severity: z.enum(["low", "medium", "high", "critical"]),
  manual_rule: z.string().min(8),
  historical_pattern: z.string().min(8),
  recommended_resolution: z.string().min(8),
  evidence: z.array(z.object({ source_id: z.string().min(3), details: z.string().min(3) })),
});

export const sourceUploadSchema = z.object({
  title: z.string().min(3),
  sourceType: z.enum(["pdf", "docx", "markdown", "txt", "csv", "json", "pasted_text"]),
  authorityLevel: z.string().min(2).optional(),
  pastedText: z.string().min(10).optional(),
});

export const patchPolicySchema = z.object({
  status: z.enum(["suggested", "approved", "rejected", "needs_review", "outdated"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  name: z.string().min(3).optional(),
  description: z.string().min(8).optional(),
});

export const reviewActionSchema = z.object({
  itemType: z.enum(["policy", "conflict", "terminology"]),
  itemId: z.string().min(3),
  action: z.enum(["approve", "edit", "reject", "mark_outdated", "request_reprocessing"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const createMemberInviteSchema = z.object({
  email: z.email().max(320),
  role: z.enum(["owner", "admin", "reviewer", "analyst", "member"]),
});

export const playgroundRequestSchema = z.object({
  inputMessage: z.string().min(5),
  channel: z.string().min(2),
  team: z.string().min(2),
  customerType: z.string().min(2),
  context: z.string().optional(),
  draft: z.string().optional(),
});

export const evaluateDraftSchema = z.object({
  scenarioId: z.string().uuid().nullable(),
  inputMessage: z.string().min(5),
  draft: z.string().min(10),
  context: z.string().optional(),
});

export const exportRequestSchema = z.object({
  exportType: z.enum(["policy_pack", "full_pack"]).default("full_pack"),
});

export const featureFlagPatchSchema = z.object({
  key: z.enum([
    "auto_send",
    "connector_gmail",
    "connector_slack",
    "connector_outlook",
    "connector_hubspot",
    "connector_salesforce",
    "connector_intercom",
    "connector_zendesk",
    "mcp_actions",
    "scim_write",
  ]),
  enabled: z.boolean(),
  rolloutPercent: z.number().min(0).max(100).default(100),
});

export const approvalRuleSchema = z.object({
  name: z.string().min(3),
  scenario: z.string().min(2),
  minScore: z.number().min(0).max(100),
  riskLevels: z.array(z.string().min(2)).min(1),
  channelAllowlist: z.array(z.string().min(2)).default([]),
  customerTypeAllowlist: z.array(z.string().min(2)).default([]),
  requiresHumanApproval: z.boolean(),
  enabled: z.boolean().default(true),
});

export const runtimeGovernanceModeSchema = z.enum([
  "suggest_only",
  "human_approval_required",
  "conditional_approval",
  "final_authority",
  "notify_only",
]);

export const agentGovernanceConfigSchema = z.object({
  agentId: z.string().min(2).max(120),
  displayName: z.string().min(2).max(160),
  channel: z.string().min(2).max(80),
  useCase: z.string().min(2).max(120),
  customerSegment: z.string().min(2).max(120).default("standard"),
  governanceMode: runtimeGovernanceModeSchema,
  scoreThreshold: z.number().min(0).max(100).default(90),
  riskLevels: z.array(z.string().min(2).max(80)).min(1).default(["low"]),
  notificationDestinations: z.array(z.string().min(2).max(120)).default(["dashboard"]),
  enabled: z.boolean().default(true),
});

export const connectorUpsertSchema = z.object({
  provider: z.enum(["gmail", "slack", "outlook", "hubspot", "salesforce", "intercom", "zendesk"]),
  displayName: z.string().min(2),
  scopes: z.array(z.string().min(1)).default([]),
  sourceSelection: z.array(z.string().min(1)).default([]),
  syncSchedule: z.enum(["manual", "hourly", "daily"]).default("manual"),
  tokenRef: z.string().min(4).optional(),
});

export const autoSendDecisionSchema = z.object({
  evaluationId: z.string().optional(),
  scenarioId: z.string().optional(),
  workspaceId: z.string().min(2).optional(),
  score: z.number().min(0).max(100),
  riskLevel: z.string().min(2),
  channel: z.string().min(2),
  customerType: z.string().min(2),
  draft: z.string().min(10),
  recipient: z.string().min(3),
  evidence: z.array(z.string()).default([]),
});

export const autoSendKillSwitchPatchSchema = z
  .object({
    scope: z.enum(["global", "workspace"]),
    workspaceId: z.string().min(2).optional(),
    active: z.boolean(),
    reason: z.string().min(3),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "workspace" && !value.workspaceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workspaceId"],
        message: "workspaceId is required when scope is workspace.",
      });
    }
  });

export const breakGlassInvokeSchema = z.object({
  reason: z.string().min(8),
  ticketRef: z.string().min(3).max(120).optional(),
  durationMinutes: z.number().int().min(5).max(1440).default(60),
});

export const breakGlassReleaseSchema = z.object({
  reason: z.string().min(8),
});

export const apiKeyCreateSchema = z.object({
  name: z.string().min(3),
  scopes: z.array(z.string().min(2)).min(1),
});

export const llmProviderCredentialCreateSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "azure_openai", "custom"]),
  displayName: z.string().min(3).max(120),
  model: z.string().min(2).max(120).optional(),
  apiKey: z.string().min(8).max(4096),
  baseUrl: z.url().max(2048).optional(),
  setActive: z.boolean().default(true),
});

export const mcpInvocationSchema = z.object({
  toolId: z.enum(["policy_pack.fetch", "draft.evaluate", "draft.repair"]),
  input: z.record(z.string(), z.unknown()).default({}),
});

export const mcpDraftEvaluateInputSchema = z.object({
  inputMessage: z.string().min(5),
  draft: z.string().min(5),
});

export const mcpDraftRepairInputSchema = z.object({
  inputMessage: z.string().min(5),
  draft: z.string().min(5),
  channel: z.string().min(2).default("email"),
  team: z.string().min(2).default("general"),
  customerType: z.string().min(2).default("standard"),
  context: z.string().optional(),
});

export const mcpPolicyPackFetchInputSchema = z.object({
  exportId: z.string().min(3).optional(),
});

export const runtimeGovernanceDecisionSchema = z.object({
  agentId: z.string().min(2).max(120),
  channel: z.string().min(2).max(80),
  useCase: z.string().min(2).max(120),
  customerSegment: z.string().min(2).max(120).default("standard"),
  governanceMode: runtimeGovernanceModeSchema.optional(),
  inputMessage: z.string().min(5).max(12000),
  draft: z.string().min(5).max(12000),
  workspaceId: z.string().min(2).max(120).optional(),
  policyPackId: z.string().min(3).optional(),
  scoreThreshold: z.number().min(0).max(100).default(90),
  riskLevel: z.string().min(2).max(80).optional(),
  notificationDestinations: z.array(z.string().min(2).max(120)).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const webhookCreateSchema = z.object({
  endpoint: z.url().max(2048),
  events: z
    .array(
      z
        .string()
        .trim()
        .regex(
          /^\*$|^[a-z0-9_]+(?:\.[a-z0-9_]+|\.\*)*$/i,
          "Event must be '*' or a dot-notated event (supports namespace wildcard like send_event.*)."
        )
    )
    .min(1),
});

export const webhookRotateSchema = z.object({
  webhookId: z.string().min(8),
});

export const scimProvisionSchema = z.object({
  action: z.enum(["provision_user", "deprovision_user", "update_role"]),
  userId: z.string().min(3),
  email: z.email().optional(),
  role: z.enum(["owner", "admin", "reviewer", "analyst", "member"]).optional(),
});

export type StructuredPolicy = z.infer<typeof structuredPolicySchema>;
export type StructuredScenario = z.infer<typeof scenarioSchema>;
export type StructuredConflict = z.infer<typeof conflictSchema>;
