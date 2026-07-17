import { PublicPage } from "@/components/marketing/public-page";

export default function PricingPage() {
  return <PublicPage eyebrow="Pricing" title="Operant is available under the MIT License." summary="You can run and adapt the software under the licence. There are no hosted plans, billing, or payment features in this repository." items={[{ title: "Use the software", body: "Run Operant in your own environment and adapt it to your workflow." }, { title: "Know what is included", body: "The repository does not include tiers, trials, invoices, or payment integrations." }]} />;
}
