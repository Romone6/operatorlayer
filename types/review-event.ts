export type ReviewEvent = {
  id: string;
  organisationId: string;
  itemType: "policy" | "terminology" | "conflict";
  itemId: string;
  action: "approve" | "edit" | "reject" | "mark_outdated" | "request_reprocessing";
  actorId: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: string;
};
