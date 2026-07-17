import { PublicPage } from "@/components/marketing/public-page";

export default function ProductPage() {
  return <PublicPage eyebrow="Product" title="Turn authorised source material into reviewed guidance." summary="OperatorLayer extracts policies, terminology, scenarios, and conflicts, then helps teams generate, evaluate, repair, and export communication guidance." items={[{ title: "Ingest", body: "Upload authorised files or paste text. Processing is organisation-scoped and source evidence is retained." }, { title: "Review", body: "Reviewers approve or reject extracted guidance before it governs exports." }, { title: "Use", body: "The playground drafts, evaluates, and repairs communication without transport or auto-send." }, { title: "Export", body: "Approved policy packs contain only the documented core artifacts and a version manifest." }]} />;
}
