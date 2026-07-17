import { PublicPage } from "@/components/marketing/public-page";

export default function SolutionsPage() {
  return <PublicPage eyebrow="Solutions" title="One reviewable communication-governance loop." summary="The core is deliberately general: bring authorised source material, derive guidance, review it, evaluate drafts, repair issues, and export approved artifacts." items={[{ title: "Policy governance", body: "Turn concrete communication rules into structured, evidence-backed records." }, { title: "Terminology intelligence", body: "Review extracted phrases instead of relying on generic style claims." }, { title: "Scenario guidance", body: "Use source-derived scenarios and evaluation rubrics to guide draft work." }, { title: "No hidden automation", body: "Every meaningful boundary remains visible to a human reviewer." }]} />;
}
