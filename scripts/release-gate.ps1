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

Invoke-Step -Name "lint" -Command { npm.cmd run lint }
Invoke-Step -Name "unit-and-coverage" -Command { npm.cmd run test }
Invoke-Step -Name "integration" -Command { npm.cmd run test:integration }
Invoke-Step -Name "build" -Command { npm.cmd run build }

Invoke-Step -Name "e2e-windows-harness" -Command { npm.cmd run test:e2e }

Invoke-Step -Name "smoke-prod-readiness" -Command { npm.cmd run test:smoke:prod-readiness }
Invoke-Step -Name "smoke-ops-readiness" -Command { npm.cmd run test:smoke:ops-readiness }
Invoke-Step -Name "smoke-governance-controls" -Command { npm.cmd run test:smoke:governance-controls }
Invoke-Step -Name "smoke-connector-providers" -Command { npm.cmd run test:smoke:connector-providers }
Invoke-Step -Name "smoke-api-mcp-docs" -Command { npm.cmd run test:smoke:api-mcp-docs }
Invoke-Step -Name "smoke-stripe-webhook-replay" -Command { npm.cmd run test:smoke:stripe-webhook-replay }
Invoke-Step -Name "smoke-webhook-event-subscriptions" -Command { npm.cmd run test:smoke:webhook-event-subscriptions }
Invoke-Step -Name "smoke-auto-send-kill-switch" -Command { npm.cmd run test:smoke:auto-send-kill-switch }
Invoke-Step -Name "smoke-mcp-conformance" -Command { npm.cmd run test:smoke:mcp-conformance }
Invoke-Step -Name "smoke-job-idempotency" -Command { npm.cmd run test:smoke:job-idempotency }
Invoke-Step -Name "smoke-queue-replay-disaster" -Command { npm.cmd run test:smoke:queue-replay-disaster }
Invoke-Step -Name "smoke-evaluation-explainability" -Command { npm.cmd run test:smoke:evaluation-explainability }
Invoke-Step -Name "smoke-saml-metadata-ingestion" -Command { npm.cmd run test:smoke:saml-metadata-ingestion }
Invoke-Step -Name "smoke-provider-outage-chaos" -Command { npm.cmd run test:smoke:provider-outage-chaos }
Invoke-Step -Name "smoke-ops-drill-scripts" -Command { npm.cmd run test:smoke:ops-drill-scripts }
Invoke-Step -Name "smoke-scim-drift-reconcile" -Command { npm.cmd run test:smoke:scim-drift-reconcile }
Invoke-Step -Name "smoke-closure-audit-evidence" -Command { npm.cmd run test:smoke:closure-audit-evidence }
Invoke-Step -Name "smoke-release-decision-go" -Command { npm.cmd run test:smoke:release-decision-go }
Invoke-Step -Name "smoke-release-decision-completion-audit" -Command { npm.cmd run test:smoke:release-decision-completion-audit }
