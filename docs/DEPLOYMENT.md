# Deployment and staging acceptance

OperatorLayer is self-hosted application code. Local tests do not prove Supabase RLS, private storage, migrations, or live model processing. Run this acceptance sequence in a non-production Supabase project before deploying or tagging a release.

## Configure

1. Create a dedicated Supabase project and private `operatorlayer-sources` storage bucket.
2. Apply every migration in `supabase/migrations` in order.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and an optional `OPERATORLAYER_EXPORT_SIGNING_KEY` in the server environment.
4. Deploy the Next.js app with no service-role or OpenAI key exposed to the client.

## Acceptance workflow

1. Sign in as an owner and create an organisation.
2. Upload a harmless authorised document and verify the stored object is private.
3. Process the source using the real OpenAI key; verify policies, terminology, scenarios, and evidence originate from that source.
4. Sign in as a second organisation and verify it cannot read the first organisation's sources, guidance, feedback, or exports.
5. Approve a policy, generate an export, then verify all eleven core artifacts and the version manifest.
6. Delete the source and verify its derived records and storage object are removed.
7. Verify no route can send a message or connect a provider.

Capture the project reference, migration output, tester, timestamp, and any failure in the release issue. Do not store customer documents or credentials in that record.
