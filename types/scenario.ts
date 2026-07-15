export type Scenario = {
  id: string;
  name: string;
  category: string;
  description: string;
  riskLevel: string;
  triggerPhrases: string[];
  approvedResponseFlow: string[];
  forbiddenBehaviours: string[];
  evaluationRubric: Record<string, number>;
};

