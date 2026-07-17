import { PublicPage } from "@/components/marketing/public-page";

export default function PricingPage() {
  return <PublicPage eyebrow="Pricing" title="The open-source core is available under MIT." summary="This release has no billing, hosted-plan, or entitlement system. Run and adapt the core under the licence, within its stated product and security boundaries." items={[{ title: "No commercial claims", body: "There are no tiers, trial claims, invoices, or payment integrations in the public core." }, { title: "Sustainable expansion", body: "Hosted or enterprise work belongs in a separately designed project, not in the upload-first release." }]} />;
}
