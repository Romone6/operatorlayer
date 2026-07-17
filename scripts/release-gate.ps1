$ErrorActionPreference = "Stop"

function Invoke-Step {
  param([string] $Name, [scriptblock] $Command)
  Write-Host "==> $Name"
  & $Command
  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    throw "Step '$Name' failed with exit code $LASTEXITCODE."
  }
}

Invoke-Step -Name "secret-scan" -Command { powershell -NoProfile -ExecutionPolicy Bypass -File scripts/security-scan.ps1 }
Invoke-Step -Name "lint" -Command { pnpm lint }
Invoke-Step -Name "unit" -Command { pnpm test }
Invoke-Step -Name "integration" -Command { pnpm test:integration }
Invoke-Step -Name "build" -Command { pnpm build }
