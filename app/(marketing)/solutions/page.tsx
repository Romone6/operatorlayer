import { PublicPage } from "@/components/marketing/public-page";

export default function SolutionsPage() {
  return <PublicPage eyebrow="Solutions" title="One clear path from source material to better drafts." summary="Add approved resources, review the guidance Operant extracts, then use it to evaluate, repair, and export drafts." items={[{ title: "Policy governance", body: "Turn concrete communication rules into structured records with evidence." }, { title: "Terminology intelligence", body: "Review the phrases that matter instead of relying on generic style claims." }, { title: "Scenario guidance", body: "Use source-derived scenarios and evaluation rubrics to guide draft work." }, { title: "Automatic intake", body: "Adding a source starts extraction; people remain in charge of the guidance it produces." }]} />;
}
