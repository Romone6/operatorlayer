export type FilmStep = {
  id: "queue" | "policy" | "score" | "review" | "repair" | "audit";
  title: string;
  eyebrow: string;
  description: string;
  windowTitle: string;
  primary: string;
  secondary: string;
  status: string;
  tone: "danger" | "warning" | "success" | "accent";
};

export const productFilmSteps: FilmStep[] = [
  {
    id: "queue",
    eyebrow: "0-4 seconds",
    title: "Agent draft enters the queue",
    description: "Incoming support response is held before export because it contains legal-risk phrasing.",
    windowTitle: "Review queue / refund escalation",
    primary: "We are legally required to refund you.",
    secondary: "Export gate: pending review",
    status: "Risk badge appears",
    tone: "danger",
  },
  {
    id: "policy",
    eyebrow: "4-8 seconds",
    title: "Policy and source evidence attach",
    description: "Operant retrieves Refund Policy v3 and Legal Threat Escalation Rule from approved sources.",
    windowTitle: "Policy match / source evidence",
    primary: "Refund Policy v3 + Legal Threat Escalation Rule",
    secondary: "Owner: Legal · Confidence: 96%",
    status: "Source attached",
    tone: "success",
  },
  {
    id: "score",
    eyebrow: "8-12 seconds",
    title: "Risk, tone, context, and policy fit are scored",
    description: "Legal interpretation and missing order context push the response into review.",
    windowTitle: "Evaluation / readiness scoring",
    primary: "Risk 86 · Tone 71 · Policy fit 94",
    secondary: "Missing context: Order ID",
    status: "Export blocked",
    tone: "warning",
  },
  {
    id: "review",
    eyebrow: "12-17 seconds",
    title: "Human review gate activates",
    description: "The response routes to the manager queue with approve, repair, and reject actions.",
    windowTitle: "Manager review / approval gate",
    primary: "Manager queue required",
    secondary: "Approve · Repair · Reject",
    status: "Human required",
    tone: "accent",
  },
  {
    id: "repair",
    eyebrow: "17-23 seconds",
    title: "Operant repairs the weak draft",
    description: "Legal interpretation is removed, escalation path is approved, and missing context is requested.",
    windowTitle: "Repair suggestion / before-after",
    primary: "I can escalate this for review after we confirm the order ID.",
    secondary: "Legal language removed · context request added",
    status: "Repair ready",
    tone: "success",
  },
  {
    id: "audit",
    eyebrow: "23-30 seconds",
    title: "Every decision is logged",
    description: "Policy match, risk signal, review route, repair, approval, export state, and outcome are written to audit history.",
    windowTitle: "Audit trail / final decision",
    primary: "Approved export logged",
    secondary: "19:10 · manager approved · evidence attached",
    status: "Audit complete",
    tone: "success",
  },
];

export const auditRows = [
  "19:04 · Policy match written",
  "19:04 · Risk detected: legal threat",
  "19:05 · Review route assigned",
  "19:07 · Repair suggested",
  "19:08 · Export blocked until approval",
  "19:10 · Manager approved",
  "19:10 · Approved export logged",
];

export const scoreRows = [
  ["Risk", 86, "danger"],
  ["Tone", 71, "warning"],
  ["Policy fit", 94, "success"],
  ["Context", 62, "warning"],
] as const;
