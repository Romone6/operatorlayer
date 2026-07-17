$ErrorActionPreference = "Stop"

$matches = rg --hidden --glob "!node_modules/**" --glob "!.git/**" --glob "!pnpm-lock.yaml" --glob "!.env.example" -n "(?i)(sk-[a-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)" .
if ($LASTEXITCODE -eq 0) {
  Write-Error "Potential credential material found:`n$matches"
  exit 1
}
if ($LASTEXITCODE -ne 1) {
  exit $LASTEXITCODE
}

Write-Host "No obvious credential material found."
