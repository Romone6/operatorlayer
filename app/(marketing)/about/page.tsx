import { PublicPage } from "@/components/marketing/public-page";

export default function AboutPage() {
  return <PublicPage eyebrow="Company" title="Govern AI-assisted communication from evidence." summary="OperatorLayer is an open-source, upload-first project for organisations that need accountable policy, terminology, scenario, evaluation, and export workflows." items={[{ title: "Evidence first", body: "Every extracted rule is tied to authorised source material for human review." }, { title: "Human control", body: "The core drafts, evaluates, repairs, and exports. It never sends customer messages." }]} />;
}
