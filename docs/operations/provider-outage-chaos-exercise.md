# Provider Outage Chaos Exercise

This exercise validates fail-safe behavior when a connector provider is temporarily unavailable.

## Scope

- Connector sync failure classification (`provider_unavailable`)
- Connector health failure reason surfacing
- Queue failure blocker propagation to readiness board
- Operator replay/remediation visibility through failure taxonomy

## Exercise Flow

1. Ensure a connector is configured and marked connected for the target provider.
2. Inject a failed `connector_sync` job with `provider_unavailable` failure class.
3. Emit connector sync failure event evidence.
4. Verify failure taxonomy, connector health, and readiness board contracts.

## Verification Commands (PowerShell)

```powershell
pnpm test:integration -- tests/integration/provider-outage-chaos.test.ts
pnpm test:smoke:provider-outage-chaos
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops-provider-outage-drill.ps1
```

## Exit Criteria

1. Failure taxonomy includes `provider_unavailable`.
2. Connector health `failureReasons` includes `provider_unavailable`.
3. Readiness board includes queue-failure blocker while outage conditions persist.
