export type SettingsPayload = {
  organisation: {
    id: string;
    name: string;
    industry: string | null;
    riskTolerance: string;
    autoSendAllowed: boolean;
    createdAt: string;
  };
  controls: {
    organisationId: string;
    defaultTone: string;
    pricingApprovalThreshold: number;
    refundApprovalThreshold: number;
    dataRetentionDays: number;
    modelProvider: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};
