export type Terminology = {
  id: string;
  phrase: string;
  frequency: number;
  status: string;
  scenarioId: string | null;
  recommendation: string | null;
  sourceEvidence: Array<{ sourceId: string; chunkIndex?: number }>;
  createdAt?: string;
  updatedAt?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};
