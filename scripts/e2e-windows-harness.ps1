$ErrorActionPreference = "Stop"

$env:OPERATORLAYER_DATA_BACKEND = "memory"
$env:OPERATORLAYER_TEST_AUTH_BYPASS = "1"
$env:OPERATORLAYER_ALLOW_TEST_BYPASS = "1"
$env:OPERATORLAYER_TEST_USER_ID = "e2e-user-001"
$env:OPERATORLAYER_TEST_ORG_ID = "e2e-org-001"
$env:OPERATORLAYER_PROCESSING_MODE = "deterministic"
$env:OPERATORLAYER_INLINE_JOB_RUNNER = "1"
if (-not $env:OPENAI_API_KEY) { $env:OPENAI_API_KEY = "e2e-openai-key" }
if (-not $env:NEXT_PUBLIC_SUPABASE_URL) { $env:NEXT_PUBLIC_SUPABASE_URL = "https://e2e.supabase.local" }
if (-not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY) { $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "e2e-anon-key" }
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { $env:SUPABASE_SERVICE_ROLE_KEY = "e2e-service-role-key" }
if (-not $env:OPERATORLAYER_SCIM_TOKEN) { $env:OPERATORLAYER_SCIM_TOKEN = "e2e-scim-token" }
if (-not $env:OPERATORLAYER_OAUTH_STATE_SECRET) { $env:OPERATORLAYER_OAUTH_STATE_SECRET = "e2e-oauth-state-secret" }
if (-not $env:GOOGLE_CLIENT_ID) { $env:GOOGLE_CLIENT_ID = "e2e-google-client-id" }
if (-not $env:GOOGLE_CLIENT_SECRET) { $env:GOOGLE_CLIENT_SECRET = "e2e-google-client-secret" }
if (-not $env:SLACK_CLIENT_ID) { $env:SLACK_CLIENT_ID = "e2e-slack-client-id" }
if (-not $env:SLACK_CLIENT_SECRET) { $env:SLACK_CLIENT_SECRET = "e2e-slack-client-secret" }
if (-not $env:MICROSOFT_CLIENT_ID) { $env:MICROSOFT_CLIENT_ID = "e2e-microsoft-client-id" }
if (-not $env:MICROSOFT_CLIENT_SECRET) { $env:MICROSOFT_CLIENT_SECRET = "e2e-microsoft-client-secret" }
if (-not $env:HUBSPOT_CLIENT_ID) { $env:HUBSPOT_CLIENT_ID = "e2e-hubspot-client-id" }
if (-not $env:HUBSPOT_CLIENT_SECRET) { $env:HUBSPOT_CLIENT_SECRET = "e2e-hubspot-client-secret" }
if (-not $env:SALESFORCE_CLIENT_ID) { $env:SALESFORCE_CLIENT_ID = "e2e-salesforce-client-id" }
if (-not $env:SALESFORCE_CLIENT_SECRET) { $env:SALESFORCE_CLIENT_SECRET = "e2e-salesforce-client-secret" }
if (-not $env:INTERCOM_CLIENT_ID) { $env:INTERCOM_CLIENT_ID = "e2e-intercom-client-id" }
if (-not $env:INTERCOM_CLIENT_SECRET) { $env:INTERCOM_CLIENT_SECRET = "e2e-intercom-client-secret" }
if (-not $env:ZENDESK_CLIENT_ID) { $env:ZENDESK_CLIENT_ID = "e2e-zendesk-client-id" }
if (-not $env:ZENDESK_CLIENT_SECRET) { $env:ZENDESK_CLIENT_SECRET = "e2e-zendesk-client-secret" }
if (-not $env:ZENDESK_AUTHORIZE_URL) { $env:ZENDESK_AUTHORIZE_URL = "https://operatorlayer-e2e.zendesk.com/oauth/authorizations/new" }
if (-not $env:ZENDESK_TOKEN_URL) { $env:ZENDESK_TOKEN_URL = "https://operatorlayer-e2e.zendesk.com/oauth/tokens" }
if (-not $env:ZENDESK_API_BASE_URL) { $env:ZENDESK_API_BASE_URL = "https://operatorlayer-e2e.zendesk.com/api/v2" }

if (-not $env:PLAYWRIGHT_CHANNEL) {
  $env:PLAYWRIGHT_CHANNEL = "msedge"
}

$dev = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev","--","--port","3101" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 12

try {
  $env:PLAYWRIGHT_BASE_URL = "http://localhost:3101"
  $env:PLAYWRIGHT_DISABLE_WEBSERVER = "1"
  $env:PLAYWRIGHT_REUSE_EXISTING_SERVER = "1"

  npm.cmd run test:e2e:raw -- --reporter=line --workers=1
} finally {
  Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue
}
