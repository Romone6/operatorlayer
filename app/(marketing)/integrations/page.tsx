import { PublicPage } from "@/components/marketing/public-page";

export default function IntegrationsPage() {
  return <PublicPage eyebrow="Integrations" title="Start with the resources you choose." summary="Add a document or paste text and Operant begins extracting guidance. It does not connect to Gmail, Slack, CRMs, or other providers." items={[{ title: "Bring your own resources", body: "Paste approved text or upload supported documents into your workspace." }, { title: "No hidden connections", body: "Operant does not read from or send through third-party communication tools." }]} />;
}
