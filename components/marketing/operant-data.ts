import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  Braces,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Fingerprint,
  GitBranch,
  Headphones,
  KeyRound,
  Layers3,
  LibraryBig,
  LineChart,
  LockKeyhole,
  Mail,
  MessageSquare,
  NotebookTabs,
  PanelTop,
  ReceiptText,
  RefreshCcw,
  Scale,
  SearchCheck,
  ShieldCheck,
  SquareKanban,
  TableProperties,
  UserCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const productMenuItems: MenuItem[] = [
  { title: "Command Layer", description: "Turn company workflows into structured AI-operable actions.", href: "/product#command-layer", icon: PanelTop },
  { title: "Policy Engine", description: "Define rules, tone, approvals, and boundaries.", href: "/product#policy-engine", icon: BookOpenCheck },
  { title: "Review Queue", description: "Approve, reject, or repair agent actions before execution.", href: "/product#review-queue", icon: SquareKanban },
  { title: "Audit Logs", description: "Track every action, decision, approval, and outcome.", href: "/product#audit-logs", icon: ReceiptText },
  { title: "Integrations", description: "Connect the tools your team already uses.", href: "/integrations", icon: Boxes },
  { title: "Evaluation", description: "Score responses and workflows against company policy.", href: "/product#evaluation", icon: SearchCheck },
];

export const solutionMenuItems: MenuItem[] = [
  { title: "Sales", description: "Keep pricing, objections, and competitor responses consistent.", href: "/solutions#sales", icon: LineChart },
  { title: "Support", description: "Enforce refund, escalation, and compliance boundaries.", href: "/solutions#support", icon: Headphones },
  { title: "Customer Success", description: "Repair renewal, churn, and account messaging.", href: "/solutions#customer-success", icon: Users },
  { title: "Operations", description: "Standardise cross-team communication and workflows.", href: "/solutions#operations", icon: Workflow },
  { title: "Enterprise AI Teams", description: "Govern agent behaviour across tools and teams.", href: "/solutions#enterprise-ai", icon: Building2 },
];

export type IntegrationRelationship = "integration" | "customer" | "partner";

export type IntegrationLogo = {
  name: string;
  logo: string;
  category: "Communication" | "CRM" | "Support" | "Docs/Knowledge" | "Developer tools" | "Finance/Billing";
  status: "Available" | "Enterprise setup required" | "Planned";
  relationship: IntegrationRelationship;
  icon: LucideIcon;
  description: string;
};

export const integrationLogos: IntegrationLogo[] = [
  { name: "Microsoft", logo: "https://cdn.simpleicons.org/microsoft/8a857a", category: "Communication", status: "Enterprise setup required", relationship: "integration", icon: Mail, description: "Connect Microsoft workspace sources when tenant OAuth and scopes are approved." },
  { name: "Google", logo: "https://cdn.simpleicons.org/google/8a857a", category: "Docs/Knowledge", status: "Enterprise setup required", relationship: "integration", icon: Archive, description: "Ingest approved Google workspace files with source controls." },
  { name: "Slack", logo: "https://cdn.simpleicons.org/slack/8a857a", category: "Communication", status: "Enterprise setup required", relationship: "integration", icon: MessageSquare, description: "Route approved playbooks and review outcomes into team channels." },
  { name: "Notion", logo: "https://cdn.simpleicons.org/notion/8a857a", category: "Docs/Knowledge", status: "Planned", relationship: "integration", icon: NotebookTabs, description: "Structure workspace knowledge into agent-operable policy objects." },
  { name: "Salesforce", logo: "https://cdn.simpleicons.org/salesforce/8a857a", category: "CRM", status: "Planned", relationship: "integration", icon: TableProperties, description: "Connect sales policies and approval signals to CRM workflows." },
  { name: "HubSpot", logo: "https://cdn.simpleicons.org/hubspot/8a857a", category: "CRM", status: "Planned", relationship: "integration", icon: Database, description: "Align account messaging, objections, and lifecycle rules." },
  { name: "Intercom", logo: "https://cdn.simpleicons.org/intercom/8a857a", category: "Support", status: "Planned", relationship: "integration", icon: Headphones, description: "Evaluate support responses against refund and escalation rules." },
  { name: "Zendesk", logo: "https://cdn.simpleicons.org/zendesk/8a857a", category: "Support", status: "Enterprise setup required", relationship: "integration", icon: ClipboardCheck, description: "Run ticket drafts through policy checks and approval gates." },
  { name: "GitHub", logo: "https://cdn.simpleicons.org/github/8a857a", category: "Developer tools", status: "Planned", relationship: "integration", icon: GitBranch, description: "Export policy packs and audit evidence into engineering workflows." },
  { name: "Linear", logo: "https://cdn.simpleicons.org/linear/8a857a", category: "Developer tools", status: "Planned", relationship: "integration", icon: GitBranch, description: "Track repair work, policy gaps, and governance follow-ups." },
  { name: "Jira", logo: "https://cdn.simpleicons.org/jira/8a857a", category: "Developer tools", status: "Planned", relationship: "integration", icon: Workflow, description: "Move review and governance tasks into existing operational queues." },
  { name: "Stripe", logo: "https://cdn.simpleicons.org/stripe/8a857a", category: "Finance/Billing", status: "Planned", relationship: "integration", icon: ReceiptText, description: "Apply billing and refund language rules before agent responses ship." },
  { name: "Airtable", logo: "https://cdn.simpleicons.org/airtable/8a857a", category: "Docs/Knowledge", status: "Planned", relationship: "integration", icon: LibraryBig, description: "Compile operating tables into structured reviewable rule sets." },
  { name: "Vercel", logo: "https://cdn.simpleicons.org/vercel/8a857a", category: "Developer tools", status: "Planned", relationship: "integration", icon: Boxes, description: "Publish policy packs and generated artifacts into deployment workflows." },
];

export const problemItems = [
  { title: "Inconsistent tone and messaging", example: "Agent promises a discount before checking pricing rules.", risk: "Off-brand buyer response", fix: "Attach draft to pricing objection playbook", status: "Tone drift", icon: MessageSquare },
  { title: "Risky or non-compliant responses", example: "Support reply gives legal interpretation during refund dispute.", risk: "Compliance exposure", fix: "Block export and route to manager", status: "High risk", icon: AlertTriangle },
  { title: "Lost context across tools", example: "Draft references renewal terms without account notes.", risk: "Wrong next step", fix: "Require missing CRM/source context", status: "Context missing", icon: Layers3 },
  { title: "Time wasted on rewrites", example: "Reviewer fixes the same escalation language again.", risk: "Manual QA loop", fix: "Repair against violated rule", status: "Rewrite loop", icon: RefreshCcw },
  { title: "Approval bottlenecks", example: "No one knows whether a refund reply needs review.", risk: "Slow response or unsafe send", fix: "Apply approval rule and queue owner", status: "Unrouted", icon: UserCheck },
  { title: "No audit trail", example: "Final response cannot show policy match or reviewer decision.", risk: "No defensible record", fix: "Log request, risk signal, decision, export", status: "Audit absent", icon: FileCheck2 },
];

export const differentiationItems = [
  { title: "Policy-backed outputs", body: "Operant attaches every agent draft to the exact policy, source, phrase library, or scenario rule it used.", icon: FileText },
  { title: "Review-before-send", body: "High-risk responses are blocked from export until a human approves, repairs, or rejects them.", icon: UserCheck },
  { title: "Scenario playbooks", body: "Teams define how agents respond to refunds, pricing objections, escalations, renewals, and legal threats.", icon: BookOpenCheck },
  { title: "Evaluation scoring", body: "Every output is scored for policy fit, tone, risk, confidence, missing context, and readiness to export.", icon: SearchCheck },
  { title: "Repair loops", body: "Weak outputs are rewritten against the exact rule they violated, then re-evaluated before approval.", icon: RefreshCcw },
  { title: "Export packs", body: "Operant exports structured rules, playbooks, phrase libraries, and approval logic into formats agents can use.", icon: Braces },
  { title: "Audit history", body: "Every request, policy match, risk signal, approval action, repair, rejection, and export is logged.", icon: ReceiptText },
  { title: "Source controls", body: "Policies remain tied to approved source material, access rules, ownership, and deletion controls.", icon: LockKeyhole },
  { title: "Team rules", body: "Sales, support, success, operations, and enterprise teams can run different rules without fragmenting governance.", icon: Users },
];

export const scenarioItems = [
  {
    team: "Sales",
    title: "Pricing objection repaired before it reaches the buyer",
    problem: "A rep asks an agent to respond to a discount request during a competitive deal.",
    before: "We can probably do 30% off if you sign this week.",
    detected: "Pricing policy violation + margin risk.",
    trigger: "Buyer says the competitor is cheaper and asks for an unapproved discount.",
    policy: "Pricing Objection Rules + Competitor Language Guardrail",
    risk: "Medium",
    missing: "Approved discount range",
    action: "Repair response using approved discount language",
    recommendation: "Reframe around implementation value, approved commercial options, and escalation to finance for non-standard terms.",
    after: "Approved objection-handling response exported to the rep.",
    final: "Approved response exported to sales workflow",
    audit: "Pricing policy match, margin risk, repair, and export event logged.",
    icon: LineChart,
  },
  {
    team: "Support",
    title: "Refund response escalated against policy",
    problem: "A support agent drafts a reply to a refund dispute with legal-threat language.",
    before: "We are legally required to refund you.",
    detected: "Legal interpretation + refund policy risk.",
    trigger: "Customer threatens legal action over refund.",
    policy: "Refund Policy v3 + Legal Escalation Rule",
    risk: "High",
    missing: "Order ID",
    action: "Block export, request Order ID, and route to manager",
    recommendation: "Acknowledge the issue, avoid legal interpretation, request the missing order ID, and provide the approved escalation path.",
    after: "Approved escalation language generated after manager review.",
    final: "Logged, pending manager approval",
    audit: "Refund policy match, legal risk, review route, repair suggestion, and blocked export logged.",
    icon: Headphones,
  },
  {
    team: "Customer Success",
    title: "Renewal-risk message gets a human review",
    problem: "An agent drafts churn-sensitive outreach for a strategic account renewal.",
    before: "Looks like you may churn, can we talk?",
    detected: "Churn-sensitive tone + account-risk wording.",
    trigger: "Account health drops before renewal call.",
    policy: "Renewal Risk Playbook + Executive Tone Rules",
    risk: "Medium",
    missing: "Latest QBR note",
    action: "Route to CSM manager review and repair tone",
    recommendation: "Use neutral account-health language, reference approved next steps, and require the QBR note before export.",
    after: "Renewal-safe message approved with source context attached.",
    final: "Final draft logged with approval evidence",
    audit: "Renewal risk, missing QBR context, tone repair, and approval event logged.",
    icon: Users,
  },
  {
    team: "Operations",
    title: "Cross-team update aligned before export",
    problem: "An operations agent creates a status update that must use approved internal terminology.",
    before: "Tell everyone the rollout is done.",
    detected: "Terminology mismatch + missing source.",
    trigger: "Weekly launch status update requested.",
    policy: "Operating Cadence Rules + Terminology Library",
    risk: "Low",
    missing: "Owner for blocked task",
    action: "Align terminology, attach source, and block unsupported claim",
    recommendation: "Replace unsupported completion language with approved rollout status and require the blocked-task owner.",
    after: "Approved internal update exported after missing context is resolved.",
    final: "Exported after missing context is resolved",
    audit: "Terminology repair, source evidence, missing owner, and export readiness logged.",
    icon: Workflow,
  },
];

export const tourSteps = [
  { key: "ingest", title: "Ingest", body: "Bring authorised manuals, policies, docs, conversations, and tickets into a permissioned source registry.", icon: Archive },
  { key: "structure", title: "Structure", body: "Convert sources into policy objects, phrase libraries, playbooks, context files, and evaluation rules.", icon: Layers3 },
  { key: "govern", title: "Govern", body: "Apply risk thresholds, approval gates, team-specific rules, and an explicit auto-send disabled control.", icon: ShieldCheck },
  { key: "review", title: "Review", body: "Route flagged outputs to a queue where reviewers approve, repair, or reject with evidence in view.", icon: ClipboardCheck },
  { key: "improve", title: "Improve", body: "Use audit events, drift signals, scores, and policy gaps to improve the operating layer.", icon: RefreshCcw },
] as const;

export const governanceItems = [
  { title: "Permissioned ingestion", body: "Sources are admin-approved and scope-based, with clear availability states for each connector.", icon: KeyRound },
  { title: "Source-level controls", body: "Extracted rules retain source evidence, confidence, review status, and deletion posture.", icon: FileCheck2 },
  { title: "Human review", body: "MVP workflows draft, evaluate, repair, approve, and export. They do not silently auto-send.", icon: UserCheck },
  { title: "Approval gates", body: "Legal, refund, pricing, and account-risk conditions can require manager approval.", icon: BadgeCheck },
  { title: "Audit logs", body: "Actions, decisions, policy matches, and outcomes are logged for internal review.", icon: ReceiptText },
  { title: "Model/data boundaries", body: "Designed for customer-owned data posture and no hidden training of general models by default.", icon: Fingerprint },
  { title: "Compliance roadmap", body: "Security planning is organised around controls, readiness evidence, and enterprise review requirements.", icon: Scale },
  { title: "Reliability controls", body: "Unavailable provider features stay labelled unavailable instead of presenting synthetic success.", icon: CheckCircle2 },
];

export const pricingPaths = [
  { name: "Validate", description: "For teams testing policy compilation and review workflows.", features: ["upload-based sources", "policy extraction", "basic scenario testing", "manual export packs", "review workflow prototype"] },
  { name: "Govern", description: "For teams managing live review queues and team rules.", features: ["review queue", "approval gates", "scenario playbooks", "evaluation scoring", "repair loops", "audit history"], highlighted: true },
  { name: "Scale", description: "For enterprise AI teams needing connectors, controls, and audit evidence.", features: ["connector onboarding", "source-level controls", "role-based governance", "audit history", "security review", "SAML/SCIM where supported"] },
];

export const pricingPlans = [
  { name: "Starter", price: "Demo-led", description: "For teams validating upload-based policy compilation and export packs.", features: ["Upload-based sources", "Policy and terminology extraction", "Playground evaluation", "Manual export packs"], cta: "Book a demo" },
  { name: "Team", price: "Custom", description: "For operators managing review queues, scenarios, and team-specific rules.", features: ["Review queue", "Scenario playbooks", "Approval rules", "Evaluation scoring", "Repair loops"], cta: "Book a demo", highlighted: true },
  { name: "Enterprise", price: "Custom", description: "For AI teams needing governed connectors, audit evidence, and enterprise setup.", features: ["Connector onboarding", "Source-level controls", "Audit history", "Security review", "SAML/SCIM setup where enabled"], cta: "Contact sales" },
];

export const featureRows = [
  "Policy-backed outputs",
  "Human approval gates",
  "Audit logs",
  "Scenario playbooks",
  "Evaluation scoring",
  "Team-specific rules",
  "Source-level controls",
  "Exportable policy packs",
  "Integrations",
  "Review queue",
  "Repair loops",
  "Security controls",
];

export const alternativeRows = [
  { label: "Operating logic lives in structured policy objects", manual: "No", prompt: "Partial", automation: "No", operant: "Yes" },
  { label: "Human review is built into the workflow", manual: "Yes", prompt: "No", automation: "Partial", operant: "Yes" },
  { label: "Policy matches and decisions are auditable", manual: "Partial", prompt: "No", automation: "Partial", operant: "Yes" },
  { label: "Repairs happen against company-specific rules", manual: "Manual", prompt: "Partial", automation: "No", operant: "Yes" },
  { label: "No hidden auto-send by default", manual: "Yes", prompt: "Depends", automation: "Depends", operant: "Yes" },
];

export const customerStoryPlaceholders = [
  { team: "Support", company: "Support workflow story", role: "VP Support", quote: "", metric: "Coming soon", story: "Escalation consistency across support teams", category: "Support" },
  { team: "Sales", company: "Revenue workflow story", role: "Head of Revenue", quote: "", metric: "Coming soon", story: "Pricing objection handling across sales teams", category: "Sales" },
  { team: "AI Platform", company: "AI governance story", role: "Head of AI", quote: "", metric: "Coming soon", story: "Audit visibility across agent-assisted responses", category: "Enterprise AI" },
];

export const footerColumns = [
  { title: "Product", links: [["Platform", "/product"], ["Command Layer", "/product#command-layer"], ["Policy Engine", "/product#policy-engine"], ["Review Queue", "/product#review-queue"], ["Evaluations", "/product#evaluation"], ["Audit Logs", "/product#audit-logs"], ["Integrations", "/integrations"]] },
  { title: "Solutions", links: [["Sales", "/solutions#sales"], ["Support", "/solutions#support"], ["Customer Success", "/solutions#customer-success"], ["Operations", "/solutions#operations"], ["Enterprise AI Teams", "/solutions#enterprise-ai"]] },
  { title: "Resources", links: [["Docs", "/docs"], ["Changelog", "/docs#changelog"], ["Security", "/security"], ["Blog", "/docs#blog"], ["Customers", "/customers"], ["Comparisons", "/pricing#alternatives"]] },
  { title: "Company", links: [["About", "/about"], ["Pricing", "/pricing"], ["Contact", "/contact"], ["Security", "/security"], ["Status", "/setup-required"]] },
] as const;
