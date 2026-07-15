param(
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"

$steps = @(
  @{ Name = "connector-health-integration"; Args = @("run", "test:integration", "--", "tests/integration/connector-health-model.test.ts") },
  @{ Name = "provider-outage-integration"; Args = @("run", "test:integration", "--", "tests/integration/provider-outage-chaos.test.ts") },
  @{ Name = "provider-outage-chaos-smoke"; Args = @("run", "test:smoke:provider-outage-chaos") }
)

Write-Host "OperatorLayer Provider Outage Chaos Drill"
Write-Host "NOTE: Run only with non-production data."

if ($DryRun) {
  Write-Host "DRY-RUN mode enabled. Planned commands:"
  foreach ($step in $steps) {
    Write-Host ("- npm.cmd " + ($step.Args -join " "))
  }
  exit 0
}

foreach ($step in $steps) {
  Write-Host ("==> " + $step.Name)
  & npm.cmd @($step.Args)
  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    throw ("Drill step '" + $step.Name + "' failed with exit code " + $LASTEXITCODE + ".")
  }
}

Write-Host "Provider outage chaos drill checks completed."
