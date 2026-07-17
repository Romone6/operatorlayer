import { PublicPage } from "@/components/marketing/public-page";

export default function CustomersPage() {
  return <PublicPage eyebrow="Community" title="No customer logos or testimonials are claimed." summary="The public project does not ship synthetic case studies, adoption metrics, or integration badges. Contributors can evaluate the core with authorised material in their own environment." items={[{ title: "Evidence over social proof", body: "Capability claims are tied to code, tests, and deployment evidence." }, { title: "Community contribution", body: "Share reproducible improvements without publishing customer documents or credentials." }]} />;
}
