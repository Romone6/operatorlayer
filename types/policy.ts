export type Policy = {
  id: string;
  name: string;
  ruleType: string;
  description: string;
  severity: string;
  status: string;
  confidence: number;
  sourceEvidence: Array<{ sourceId: string; chunkIndex?: number }>;
  structuredRule: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};
