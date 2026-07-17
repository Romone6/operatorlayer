import { PublicPage } from "@/components/marketing/public-page";

export default function IntegrationsPage() {
  return <PublicPage eyebrow="Integrations" title="No live integrations are part of this release." summary="OperatorLayer is intentionally upload-first. It does not sync Gmail, Slack, CRM, or other providers, and it does not send messages." items={[{ title: "Current input", body: "Paste authorised text or upload supported documents into an organisation-scoped workspace." }, { title: "Expansion boundary", body: "A connector requires a separately scoped design, permissions model, real implementation, and evidence before it can be claimed." }]} />;
}
