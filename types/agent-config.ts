export type RuntimeGovernanceMode =
  | "suggest_only"
  | "human_approval_required"
  | "conditional_approval"
  | "final_authority"
  | "notify_only";

export type AgentGovernanceConfig = {
  id: string;
  organisationId: string;
  agentId: string;
  displayName: string;
  channel: string;
  useCase: string;
  customerSegment: string;
  governanceMode: RuntimeGovernanceMode;
  scoreThreshold: number;
  riskLevels: string[];
  notificationDestinations: string[];
  enabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};
