# Backup and Restore Drill

This drill validates operational recovery of the application state and queue state.

## Preconditions

1. Test environment with non-production data only.
2. Current migration version recorded.
3. Readiness board captured before drill.

## Drill Steps

1. Export database backup snapshot using environment-approved tooling.
2. Record queue state counts: queued/running/failed/dead-letter.
3. Restore backup into isolated verification environment.
4. Run schema verification and API smoke tests.
5. Compare restored counts and key records against pre-drill snapshot.

## Verification Commands (PowerShell)

```powershell
pnpm test:smoke:prod-readiness
pnpm test:smoke:ops-readiness
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/ops-backup-restore-drill.ps1
```

## Success Criteria

1. Restored schema matches expected migration state.
2. Core API smoke commands pass.
3. Queue counts are explainable (including expected replay differences).
4. No new `critical` readiness-board blocker introduced by restoration.
