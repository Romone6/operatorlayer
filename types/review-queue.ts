export type ReviewEntityType = "policy" | "terminology" | "conflict";
export type ReviewQueueItemType = ReviewEntityType | "outdated";

export type ReviewQueueItem = {
  id: string;
  type: ReviewQueueItemType;
  entityType: ReviewEntityType;
  title: string;
  status: string;
  severity?: string;
  confidence?: number;
  section: ReviewQueueSectionId;
  summary: string;
  evidence: string[];
  sourceId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
};

export type ReviewQueueSectionId =
  | "suggested_rules"
  | "low_confidence"
  | "risky_terminology"
  | "conflicts"
  | "outdated_behaviour";

export type ReviewQueueSection = {
  id: ReviewQueueSectionId;
  label: string;
  items: ReviewQueueItem[];
};

export type ReviewQueuePayload = {
  sections: ReviewQueueSection[];
  summary: {
    total: number;
    suggestedRules: number;
    lowConfidence: number;
    riskyTerminology: number;
    conflicts: number;
    outdatedBehaviour: number;
  };
};

export type ReviewActionRequest = {
  itemType: ReviewEntityType;
  itemId: string;
  action: "approve" | "edit" | "reject" | "mark_outdated" | "request_reprocessing";
  payload?: Record<string, unknown>;
};
