import { PublicPage } from "@/components/marketing/public-page";

export default function SecurityPage() {
  return <PublicPage eyebrow="Security" title="Your sources stay under your control." summary="Operant is designed for authorised resources, organisation isolation, private source storage, human review, and no general-model training on customer data by default." items={[{ title: "No delivery channel", body: "Operant cannot send emails or messages, so there is no auto-send path." }, { title: "Private source handling", body: "Uploads are size-limited and stored using private object paths." }, { title: "Report responsibly", body: "Do not open public vulnerability issues or include customer source documents in reports." }, { title: "Verify before use", body: "Run the documented test and deployment checks against your own Supabase and model-provider configuration." }]} />;
}
