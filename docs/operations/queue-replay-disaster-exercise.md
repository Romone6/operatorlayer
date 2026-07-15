# Queue Replay Disaster Exercise

This exercise validates replay tooling for failed/dead-letter jobs.

## Scope

- Connector sync jobs
- Export generation jobs
- Webhook delivery jobs
- Invite delivery jobs

## Exercise Flow

1. Seed one failed or dead-letter job per in-scope job type.
2. Replay each job through `POST /api/jobs/{id}/replay`.
3. Run worker processing for replayed jobs.
4. Confirm terminal status and evidence trail.

## Verification Commands (PowerShell)

```powershell
pnpm test:integration -- tests/integration/jobs-api.test.ts
pnpm test:integration -- tests/integration/enterprise-readiness-board.test.ts
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops-queue-replay-drill.ps1
```

## Exit Criteria

1. Replay endpoint accepts only failed/dead-letter jobs.
2. Replay changes job state to queued with `replayedAt`.
3. Readiness board queue blockers reduce after successful replay and processing.
