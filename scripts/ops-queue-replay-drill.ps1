param(
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"

$steps = @(
  @{ Name = "jobs-integration"; Args = @("run", "test:integration", "--", "tests/integration/jobs-api.test.ts") },
  @{ Name = "readiness-board-integration"; Args = @("run", "test:integration", "--", "tests/integration/enterprise-readiness-board.test.ts") },
  @{ Name = "queue-replay-disaster-smoke"; Args = @("run", "test:smoke:queue-replay-disaster") }
)

Write-Host "OperatorLayer Queue Replay Disaster Drill"
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

Write-Host "Queue replay drill checks completed."
