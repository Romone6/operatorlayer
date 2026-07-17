import { z } from "zod";

export const structuredPolicySchema = z.object({
  rule_id: z.string().min(3), rule_type: z.string().min(3), scenario: z.string().min(3),
  severity: z.enum(["low", "medium", "high", "critical"]), status: z.enum(["suggested", "approved", "rejected", "needs_review", "outdated"]),
  rule: z.string().min(20), required_sequence: z.array(z.string().min(3)).min(2), approved_phrases: z.array(z.string().min(3)).min(1),
  forbidden_phrases: z.array(z.string().min(3)).min(1), human_review_conditions: z.array(z.string().min(3)).min(1), confidence: z.number().min(0).max(1),
});

export const scenarioSchema = z.object({
  name: z.string().min(3), category: z.string().min(3), description: z.string().min(10), risk_level: z.string().min(3),
  trigger_phrases: z.array(z.string().min(3)).min(1), response_flow: z.array(z.string().min(3)).min(2),
  approved_terminology: z.array(z.string().min(3)).min(1), forbidden_terminology: z.array(z.string().min(3)).min(1),
  examples: z.array(z.string().min(8)).min(1), bad_examples: z.array(z.string().min(8)).min(1),
  approval_rules: z.array(z.string().min(6)).min(1), evaluation_rubric: z.record(z.string(), z.number().min(0).max(100)),
});

export const conflictSchema = z.object({
  conflict_type: z.string().min(3), severity: z.enum(["low", "medium", "high", "critical"]), manual_rule: z.string().min(8),
  historical_pattern: z.string().min(8), recommended_resolution: z.string().min(8),
  evidence: z.array(z.object({ source_id: z.string().min(3), details: z.string().min(3) })),
});

export const sourceUploadSchema = z.object({
  title: z.string().min(3), sourceType: z.enum(["pdf", "docx", "markdown", "txt", "csv", "json", "pasted_text"]),
  authorityLevel: z.string().min(2).optional(), pastedText: z.string().min(10).optional(),
});

export const patchPolicySchema = z.object({
  status: z.enum(["suggested", "approved", "rejected", "needs_review", "outdated"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(), name: z.string().min(3).optional(), description: z.string().min(8).optional(),
});

export const reviewActionSchema = z.object({
  itemType: z.enum(["policy", "conflict", "terminology"]), itemId: z.string().min(3),
  action: z.enum(["approve", "edit", "reject", "mark_outdated", "request_reprocessing"]), payload: z.record(z.string(), z.unknown()).optional(),
});

export const playgroundRequestSchema = z.object({
  inputMessage: z.string().min(5), channel: z.string().min(2), team: z.string().min(2), customerType: z.string().min(2),
  context: z.string().optional(), draft: z.string().optional(),
});

export const exportRequestSchema = z.object({ exportType: z.enum(["policy_pack", "full_pack"]).default("full_pack") });

export type StructuredPolicy = z.infer<typeof structuredPolicySchema>;
export type StructuredScenario = z.infer<typeof scenarioSchema>;
export type StructuredConflict = z.infer<typeof conflictSchema>;
