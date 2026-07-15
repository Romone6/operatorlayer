import type { Source } from "@/types/source";

export type GovernanceJob = {
  id: string;
  sourceId: string | null;
  jobType: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GovernanceLog = {
  id: string;
  sourceId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type SourceGovernancePayload = {
  sources: Source[];
  jobs: GovernanceJob[];
  logs: GovernanceLog[];
};
