import { PublicPage } from "@/components/marketing/public-page";

export default function ContactPage() {
  return <PublicPage eyebrow="Contact" title="Start with the repository and security policy." summary="This project is maintained in the open. Use the contributor guide for changes and the security policy for confidential vulnerability reports." items={[{ title: "Contribute", body: "Open a scoped issue before substantial work so the upload-first core remains coherent." }, { title: "Report a vulnerability", body: "Use the private reporting route documented in SECURITY.md; do not include customer documents." }]} />;
}
