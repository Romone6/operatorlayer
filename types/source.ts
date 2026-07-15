export type Source = {
  id: string;
  title: string;
  sourceType: string;
  authorityLevel: string | null;
  processingStatus: string;
  policyCount: number;
  phraseCount: number;
  scenarioCount: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

