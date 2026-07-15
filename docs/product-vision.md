# OperatorLayer Complete Product Vision

Date: 2026-06-01
Workspace: `C:\OperatorLayer\operatorlayer-app`

## Product Definition

OperatorLayer is a company communication operating layer for AI agents.

It captures, governs, tests, updates, and audits how AI agents communicate on behalf of an organisation. It is not a standalone chatbot and not only a static rule database. It is infrastructure that existing agents, copilots, sales assistants, support assistants, and workflow automations call when they need company-specific communication identity, knowledge, rules, boundaries, approvals, and evidence.

The complete product turns authorised company information and communication history into governed agent-ready systems:

- company voice and communication style,
- approved terminology, slogans, positioning, and word banks,
- forbidden phrases, risky claims, and unsupported promises,
- structured examples of approved and rejected communication,
- product, pricing, support, security, and company knowledge packs,
- scenario playbooks for sales, support, customer success, compliance, and internal operations,
- escalation hierarchy and approval boundaries,
- dynamic evaluation rubrics,
- runtime governance decisions,
- audit records and continuous improvement signals.

## Problem Fixed

Companies want AI agents to communicate with customers, prospects, employees, and partners, but the agents do not naturally understand the company's real communication system.

That system usually lives across:

- sales decks,
- support manuals,
- brand and tone guides,
- product documentation,
- pricing rules,
- escalation policies,
- legal and compliance rules,
- approved examples,
- rejected examples,
- CRM conversations,
- support tickets,
- email threads,
- Slack or Teams discussions,
- manager feedback,
- tribal knowledge.

Without OperatorLayer, companies face predictable risks:

- agents speak off-brand,
- agents use outdated product language,
- agents promise discounts, refunds, ROI, timelines, or legal positions they are not authorised to promise,
- agents miss escalation boundaries,
- support responses become inconsistent,
- sales responses lose positioning discipline,
- managers become manual review bottlenecks,
- leadership cannot prove why an AI-generated response was allowed, blocked, repaired, or escalated,
- audit, compliance, and enterprise buyers cannot trust the communication workflow.

OperatorLayer fixes this by turning authorised company knowledge and communications into governed, testable, auditable, agent-ready operating instructions.

## Core Product Thesis

The strongest version of OperatorLayer is not just rule extraction. It is continuous agent alignment.

OperatorLayer should ensure every connected AI agent:

- knows what the company knows,
- sounds like the company wants to sound,
- uses approved terminology and positioning,
- avoids risky or forbidden language,
- follows scenario-specific communication flows,
- respects approval and escalation boundaries,
- adapts when company knowledge, strategy, or policy changes,
- can be tested automatically before and after deployment,
- can be audited after every governed decision.

The selling point is:

> OperatorLayer lets companies deploy AI agents that communicate in the company's voice, with the company's knowledge, inside the company's boundaries, with ongoing proof that they keep doing so.

## Complete Product Loop

The complete loop is:

1. Ingest
2. Extract
3. Structure
4. Review
5. Package
6. Test
7. Refine
8. Govern
9. Audit
10. Improve

This expands the current MVP loop of guide, generate, evaluate, repair, approve, and learn into a full lifecycle platform.

## Ingestion Model

OperatorLayer must support both automated connector-based ingestion and manual source creation.

### Automated Ingestion

When permission is granted, OperatorLayer should ingest authorised company data through connectors such as:

- Gmail,
- Outlook,
- Slack,
- Microsoft Teams,
- HubSpot,
- Salesforce,
- Intercom,
- Zendesk,
- Notion,
- Google Drive,
- SharePoint,
- internal knowledge bases,
- sales enablement repositories,
- support documentation systems,
- product documentation systems.

Automated ingestion should discover:

- real communication patterns,
- common objections,
- common support issues,
- frequently used phrases,
- high-performing sales language,
- weak or risky communication habits,
- repeated escalation cases,
- knowledge gaps,
- outdated language,
- customer pain points,
- scenario frequency,
- team-specific response patterns.

Automated ingestion must remain permissioned, source-scoped, auditable, and least-privilege. It must not become uncontrolled scraping or hidden model training.

### Manual Source Material

Manual source creation and upload must remain a first-class workflow.

Companies need manual sources because automated ingestion may be vague, ambiguous, outdated, noisy, or missing strategic context. A company may want to create catered OperatorLayer-specific documents such as:

- official company voice guide,
- approved sales narrative,
- pricing objection guide,
- support escalation guide,
- security answer bank,
- compliance disclaimer list,
- product positioning document,
- approved phrase bank,
- forbidden phrase bank,
- ideal response examples,
- rejected response examples,
- region-specific rules,
- team-specific rules,
- campaign-specific messaging.

Manual sources define what the company wants the agent to do, not only what employees historically did.

### Source Authority

OperatorLayer should rank sources by authority.

Example authority order:

1. legal and compliance policies,
2. security policies,
3. pricing and contract rules,
4. current product documentation,
5. brand and voice guides,
6. approved sales and support playbooks,
7. approved response examples,
8. reviewed historical communications,
9. unresolved historical communications,
10. informal team discussions.

Historical behaviour should be treated as candidate intelligence, not automatic truth. If sales reps frequently use a phrase that legal forbids, OperatorLayer should flag a conflict rather than approve the phrase.

## Company Communication Identity

OperatorLayer should create and maintain a company communication identity model.

This model should include:

- voice profile,
- tone range by channel and customer type,
- preferred wording,
- banned wording,
- product naming,
- slogans and taglines,
- value propositions,
- objection-handling language,
- competitive positioning,
- proof points,
- support style,
- escalation tone,
- apology patterns,
- executive communication style,
- regional or segment-specific differences.

This identity model should feed both:

- agent runtime guidance,
- automated tests that check whether agents still behave as desired.

## Agent-Ready Artifacts

OperatorLayer should generate versioned artifacts that connected agents can consume.

Current required artifacts remain valid:

- `company_voice.md`,
- `communication_policy.json`,
- `scenario_playbooks.json`,
- `phrase_library.json`,
- `forbidden_phrases.json`,
- `approval_rules.json`,
- `evaluation_rubric.json`,
- `approved_examples.jsonl`,
- `rejected_examples.jsonl`,
- `agent_prompt_pack.md`.

The complete product should add or evolve toward:

- `company_identity.json`,
- `knowledge_pack.json`,
- `sales_positioning_pack.json`,
- `support_resolution_pack.json`,
- `escalation_hierarchy.json`,
- `agent_permissions.json`,
- `runtime_governance_policy.json`,
- `test_suite_manifest.json`,
- `agent_alignment_report.json`,
- `policy_version_manifest.json`.

All artifacts should be versioned, signed or checksumed, traceable to sources, and auditable.

## Automated Testing And Calibration

Testing must be dynamic and automated.

OperatorLayer should generate and run tests based on:

- company policies,
- scenario playbooks,
- approved examples,
- rejected examples,
- real customer conversations,
- recent agent failures,
- human review outcomes,
- new source ingestion,
- product or pricing changes,
- new connectors,
- new agents,
- customer-defined goals.

Automated tests should evaluate:

- rule adherence,
- boundary adherence,
- escalation correctness,
- tone and style match,
- use of approved language,
- avoidance of forbidden phrases,
- product knowledge accuracy,
- scenario flow completeness,
- sales usefulness,
- support resolution quality,
- confidence and uncertainty handling,
- evidence quality,
- response consistency across repeated runs.

Testing should happen:

- before an agent is launched,
- when a new agent is connected,
- when source material changes,
- when policies change,
- after incidents,
- after repeated human review failures,
- on scheduled intervals,
- on customer request.

## Calibration Loop

OperatorLayer should use test and audit findings to recommend controlled adjustments.

Examples:

- If an agent over-escalates pricing questions, recommend changing the pricing objection playbook.
- If an agent misses a required security disclaimer, add the disclaimer to the security scenario and prompt pack.
- If an agent uses outdated product language, update the phrase bank and knowledge pack.
- If responses are compliant but not persuasive enough for sales, update the sales positioning examples and scoring rubric.
- If support responses are correct but too cold, update the tone profile and approved empathy phrases.
- If a rule is repeatedly violated because it is ambiguous, flag the rule for human clarification.

Updates should be configurable:

- auto-apply low-risk changes,
- stage for admin review,
- require policy owner approval,
- test in sandbox first,
- roll out to selected agents,
- roll back to previous policy pack.

OperatorLayer should never silently mutate high-risk governance boundaries without permission.

## Runtime Governance

Runtime governance must be fast enough for customer service and sales.

OperatorLayer should not run the full playground or full regression suite on every customer response. The runtime path should use precomputed, versioned policy and identity packs.

Runtime calls should support:

- scenario detection,
- relevant rule retrieval,
- company voice and phrase guidance,
- draft evaluation,
- repair suggestion,
- approval decision,
- escalation routing,
- notification routing,
- audit logging.

The runtime decision should be based on the customer's configured governance mode.

## Governance Modes

OperatorLayer must support configurable authority levels per organisation, agent, channel, use case, customer segment, risk level, and scenario.

### Suggest Only

The agent may draft but never send. A human sends the final response.

Use for:

- early rollout,
- executive communication,
- legal-sensitive messages,
- new or untrusted agents.

### Human Approval Required

OperatorLayer evaluates and repairs, but explicit human approval is required before the agent responds.

Use for:

- pricing exceptions,
- enterprise contract discussions,
- refunds,
- security reviews,
- regulated communication.

### Conditional Approval

OperatorLayer may allow the agent to respond automatically when risk is low and scores are above threshold. Human approval is required when conditions are triggered.

Example triggers:

- low confidence,
- weak source evidence,
- forbidden phrase detected,
- missing required scenario step,
- legal topic,
- discount request,
- refund request,
- security claim,
- high-value customer,
- strategic account,
- customer sentiment risk.

### OperatorLayer Final Authority

OperatorLayer's decision is final. If it approves a response, the AI agent may respond without a human in the loop.

This mode must still log:

- original customer message,
- agent draft,
- repaired draft if any,
- score breakdown,
- policy version,
- source evidence,
- decision reason,
- notification record,
- final response state.

Use for mature, low-risk, high-volume workflows where speed matters.

### Notify Only

OperatorLayer does not block the response. It monitors, scores, records, and notifies when needed.

Use for:

- early discovery,
- post-send QA,
- sales coaching,
- rollout observation,
- low-friction adoption.

## Personalised Permission Model

Customers must be able to configure OperatorLayer to operate exactly as they need.

Configuration should include:

- agent-level authority,
- channel-level governance,
- team-level policy,
- customer-segment policy,
- risk thresholds,
- score thresholds,
- approval owners,
- escalation hierarchy,
- notification channels,
- auto-repair permission,
- auto-send permission,
- audit depth,
- testing frequency,
- update approval mode,
- allowed source types,
- allowed connector scopes,
- retention and deletion policies,
- rollback behaviour.

Example:

> For the support agent, auto-approve low-risk troubleshooting responses scoring above 92. Require human approval for refund, legal, outage, or security topics. Notify the support lead in Slack for every repair. Run weekly regression tests and after each support policy update.

Example:

> For the sales agent, allow automatic follow-up responses for non-enterprise prospects. Require manager approval for discounts, competitor claims, legal terms, and enterprise deals above threshold. Create a Linear task when pricing risk is detected.

## Notifications And Escalation

OperatorLayer should notify the right people or systems based on customer configuration.

Notification destinations should include:

- Slack,
- Microsoft Teams,
- Linear,
- email,
- CRM task,
- support ticket,
- webhook,
- internal dashboard.

Notification examples:

- agent response approved automatically,
- response repaired before approval,
- human approval required,
- pricing exception detected,
- security question detected,
- outdated product language detected,
- policy drift detected,
- scheduled test suite failed,
- new source conflict detected,
- connector ingestion failed,
- policy pack updated.

## Audit And Explainability

Every governed communication should be explainable.

OperatorLayer should record:

- source message,
- agent identity,
- channel,
- customer segment,
- scenario matched,
- policy pack version,
- knowledge pack version,
- relevant source evidence,
- approved phrases used,
- forbidden phrases found,
- missing response steps,
- score breakdown,
- repair diff,
- approval decision,
- escalation decision,
- notification records,
- final state,
- rollback pointer.

When something goes wrong, the customer must be able to determine whether the failure came from:

- source data,
- extraction quality,
- rule design,
- outdated knowledge,
- weak prompt pack,
- evaluation threshold,
- agent behaviour,
- notification or approval routing,
- connector/runtime failure.

## Implementation Pillars

The complete implementation should be built on the foundations already present in the repo.

### Current Foundations

Already present foundations include:

- upload-based source flow,
- extraction pipeline,
- policy, terminology, scenario, and conflict records,
- playground evaluation and repair,
- export artifact generation,
- review queue,
- enterprise readiness board,
- release-decision contract,
- connector catalog and fail-closed availability,
- approval policies,
- auto-send decision and kill-switch routes,
- audit events,
- SAML/SCIM route surfaces,
- billing and entitlements surfaces,
- API/MCP docs and starter SDK,
- operations and procurement docs.

### Required Evolution

The product should evolve from MVP to complete platform through these implementation pillars:

1. Automated connector ingestion with real provider proof.
2. Source authority, conflict resolution, and trust scoring.
3. Company identity and knowledge model.
4. Versioned agent-ready packs.
5. Dynamic automated test generation.
6. Agent calibration and regression testing.
7. Per-agent governance configuration.
8. Fast runtime decision API.
9. Notification and escalation routing.
10. Continuous audit-driven improvement.
11. Production IAM, connector, billing, and operations proof.
12. Enterprise buyer evidence package.

## Target Runtime Workflow

1. Customer grants connector permissions or uploads manual sources.
2. OperatorLayer ingests authorised data.
3. OperatorLayer extracts candidate knowledge, phrases, examples, scenarios, and boundaries.
4. OperatorLayer ranks source authority and detects conflicts.
5. Human reviewers approve or adjust the company identity and governance model.
6. OperatorLayer generates versioned agent-ready packs.
7. OperatorLayer creates dynamic test suites for each connected agent.
8. The agent is tested and calibrated until it meets customer thresholds.
9. The customer chooses runtime governance mode per agent and use case.
10. The agent goes live.
11. Each customer interaction calls OperatorLayer's fast runtime governance API.
12. OperatorLayer allows, repairs, blocks, escalates, or notifies according to policy.
13. Audit records are stored with evidence.
14. OperatorLayer uses audit outcomes to recommend updates.
15. Updates are tested, approved, versioned, and rolled out.

## Enterprise Sell-Ready Standard

The product is sell-ready only when it can prove:

- real connector OAuth and sync/backfill flows in a production-like environment,
- permissioned ingestion and least-privilege source access,
- company identity artifacts generated from real authorised sources,
- dynamic test suites generated from real policies and scenarios,
- per-agent governance settings enforced at runtime,
- human approval and no-human approval modes both work as configured,
- notification routing works for at least one real destination,
- audit records explain each runtime decision,
- policy pack versioning and rollback work,
- SAML/SCIM lifecycle is proven with production-like identity provider flows,
- billing/entitlements are active and enforced,
- operational drills are run and evidenced,
- readiness board can reach `go` only with real evidence.

## Non-Negotiables

- No fake integrations.
- No fake dashboard data.
- No fake processed source states.
- No fake evaluations.
- No fake exports.
- No hidden model training on customer data.
- Automated ingestion requires explicit permission.
- Manual source creation remains available.
- Historical communication is candidate intelligence, not automatic truth.
- Unsupported capabilities must be disabled and labelled unavailable.
- Empty states are better than fake data.
- Runtime final-authority mode must still be fully auditable.
- High-risk governance updates require customer-controlled approval.

## Implementation North Star

The implementation target is:

> A fully automated, configurable, auditable communication alignment platform that continuously builds, tests, governs, and improves how each customer's AI agents communicate, while preserving customer control over permissions, approvals, source authority, and runtime autonomy.

