param(
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"

$steps = @(
  @{ Name = "prod-readiness-smoke"; Args = @("run", "test:smoke:prod-readiness") },
  @{ Name = "ops-readiness-smoke"; Args = @("run", "test:smoke:ops-readiness") }
)

Write-Host "OperatorLayer Backup/Restore Drill"
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

Write-Host "Backup/Restore drill checks completed."
