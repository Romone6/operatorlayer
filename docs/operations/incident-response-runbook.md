# Incident Response Runbook

This runbook defines severity mapping, ownership, and escalation for production incidents.

## Severity Mapping

- `sev0` (critical business outage)
- `sev1` (major degradation)
- `sev2` (partial degradation)
- `sev3` (minor issue)

## Response SLAs

- `sev0`: acknowledge in `5m`, escalate in `10m`, owner `platform-director`
- `sev1`: acknowledge in `15m`, escalate in `30m`, owner `platform-oncall`
- `sev2`: acknowledge in `30m`, escalate in `60m`, owner `service-owner`
- `sev3`: acknowledge in `120m`, escalate in `240m`, owner `product-owner`

## First 15 Minutes Checklist

1. Confirm blast radius by tenant/workspace and impacted capability.
2. Set mitigation mode: feature flag rollback, kill switch, or connector pause.
3. Capture trace IDs and failing request/job identifiers.
4. Post current status, owner, and next update timestamp.

## Containment Controls

1. Trigger global kill switch for auto-send if sends are unsafe.
2. Disable affected connector ingestion path by feature flag when needed.
3. Pause replay/worker fanout when dead-letter growth is uncontrolled.

## Recovery Criteria

1. SLO metric returns to baseline.
2. Dead-letter backlog cleared or bounded with replay evidence.
3. Readiness board returns no new `critical` blockers.
