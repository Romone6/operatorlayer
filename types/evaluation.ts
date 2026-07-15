export type Evaluation = {
  id: string;
  scenarioId: string | null;
  inputMessage: string;
  originalDraft: string;
  repairedDraft: string | null;
  detectedPhrases: string[];
  missingRequiredElements: string[];
  policyViolations: string[];
  approvalRequired: boolean;
  repairRequired: boolean;
  createdAt: string;
  scores: {
    total: number;
    policyCompliance: number;
    scenarioFlow: number;
    approvedTerminology: number;
    forbiddenPhraseAvoidance: number;
    toneMatch: number;
    clarityNextStep: number;
    riskOverride?: string;
  };
};
