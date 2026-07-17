# Releasing OperatorLayer

## Preconditions

- The capability ledger, README, changelog, and public routes describe the same scope.
- GitHub private vulnerability reporting, branch protection, required CI, and secret scanning are enabled in the official repository.
- The staging acceptance workflow in [DEPLOYMENT.md](DEPLOYMENT.md) has passed with recorded evidence.

## Release checklist

```powershell
pnpm install --frozen-lockfile
pnpm test:release-gate
```

Then review the diff for customer data, credentials, local Supabase state, and unsupported claims. Create a semantic-version tag only after CI passes from a clean clone. Publish release notes that link to the exact changelog section and state any known limitations.

Do not publish packages, hosted deployments, or compatibility guarantees that have not been explicitly implemented and tested.
