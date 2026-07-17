import { PublicPage } from "@/components/marketing/public-page";

export default function ProductPage() {
  return <PublicPage eyebrow="Product" title="Turn authorised source material into guidance your AI can follow." summary="Operant extracts policies, terminology, scenarios, and conflicts, then helps teams generate, evaluate, repair, and export communication guidance." items={[{ title: "Add a source", body: "Upload approved files or paste text. Extraction starts automatically and keeps source evidence." }, { title: "Review", body: "Reviewers approve, edit, or reject guidance before it is used in an export." }, { title: "Use", body: "The playground drafts, evaluates, and repairs communication without sending anything." }, { title: "Export", body: "Create a versioned policy pack from approved records." }]} />;
}
