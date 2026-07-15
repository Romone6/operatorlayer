export type AppRole = "owner" | "admin" | "reviewer" | "analyst" | "member";

export type Member = {
  id: string;
  organisationId: string;
  email: string;
  name: string | null;
  role: AppRole;
  createdAt: string;
};

export type MemberInvite = {
  id: string;
  organisationId: string;
  email: string;
  role: AppRole;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string | null;
  expiresAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
  acceptUrl?: string;
  mailtoUrl?: string;
  deliveryState?: "not_requested" | "queued" | "running" | "succeeded" | "failed" | "dead_letter";
};

