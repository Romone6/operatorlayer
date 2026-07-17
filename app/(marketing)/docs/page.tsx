import { PublicPage } from "@/components/marketing/public-page";

export default function DocsPage() {
  return <PublicPage eyebrow="Documentation" title="The repository is the product documentation." summary="Start with the README for setup, the capability ledger for current boundaries, and the contributor guide for the supported development workflow." items={[{ title: "Getting started", body: "Create an organisation, upload authorised sources, review extraction, then generate an approved export." }, { title: "Exports", body: "The core emits only evidence-backed policy-pack artifacts after policy approval." }, { title: "Capability states", body: "Empty states and explicit unavailable states replace fabricated dashboards and integrations." }, { title: "Release truth", body: "Changes are accepted only with tests and documentation that match the real implementation." }]} />;
}
