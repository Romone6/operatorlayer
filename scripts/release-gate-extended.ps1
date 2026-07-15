$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name,
    [Parameter(Mandatory = $true)]
    [scriptblock] $Command
  )

  Write-Host "==> $Name"
  & $Command
  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    throw "Step '$Name' failed with exit code $LASTEXITCODE."
  }
}

Invoke-Step -Name "core-release-gate" -Command { npm.cmd run test:release-gate }

Invoke-Step -Name "supabase-start" -Command { npx.cmd supabase start }

try {
  Invoke-Step -Name "supabase-smoke" -Command {
    $status = npx.cmd supabase status -o env
    foreach ($line in $status) {
      if ($line -match '^([A-Z0-9_]+)=\"(.*)\"$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
      }
    }

    $env:OPERATORLAYER_DATA_BACKEND = "supabase"
    $env:NEXT_PUBLIC_SUPABASE_URL = $env:API_URL
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $env:ANON_KEY
    $env:SUPABASE_SERVICE_ROLE_KEY = $env:SERVICE_ROLE_KEY
    $env:SUPABASE_STORAGE_BUCKET = "operatorlayer-sources"
    $env:OPERATORLAYER_TEST_AUTH_BYPASS = "1"
    $env:OPERATORLAYER_ALLOW_TEST_BYPASS = "1"
    $env:OPERATORLAYER_INLINE_JOB_RUNNER = "1"
    $env:OPERATORLAYER_PROCESSING_MODE = "deterministic"

    npm.cmd run test:smoke:supabase
  }
} finally {
  Invoke-Step -Name "supabase-stop" -Command { npx.cmd supabase stop }
}
