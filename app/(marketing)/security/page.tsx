import { PublicPage } from "@/components/marketing/public-page";

export default function SecurityPage() {
  return <PublicPage eyebrow="Security" title="Security boundaries are part of the core contract." summary="The project is designed for authorised ingestion, organisation isolation, private source storage, human review, and no general-model training on customer data by default." items={[{ title: "No delivery channel", body: "The MVP cannot send emails or messages, so it has no auto-send path." }, { title: "Private source handling", body: "Uploads are size-limited and stored using private object paths." }, { title: "Report responsibly", body: "Do not open public vulnerability issues or include customer source documents in reports." }, { title: "Verify before use", body: "Run the documented test and deployment checks against your own Supabase and model-provider configuration." }]} />;
}
