import { PublicPage } from "@/components/marketing/public-page";

export default function AboutPage() {
  return <PublicPage eyebrow="Company" title="Give AI the guidance your team already trusts." summary="Operant turns approved resources into policies, terminology, scenarios, and checks that people can review before they shape a draft." items={[{ title: "Evidence first", body: "Every extracted rule links back to the resource it came from." }, { title: "Human control", body: "People review the guidance. Operant works on drafts and exports; it never sends customer messages." }]} />;
}
