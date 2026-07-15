# OperatorLayer SLO Targets (Baseline)

These are the current sell-ready baseline targets for enterprise operations.
They describe operational expectations only and are not certification claims.

## SLOs

- API latency p95: `<= 400ms`
- Job completion latency p95: `<= 15 minutes`
- Connector sync freshness: `<= 60 minutes`
- Evaluation throughput: `>= 40 evaluations/minute`
- Webhook delivery success: `>= 99.5%`

## Measurement Scope

- API latency: measured at application edge for authenticated API routes.
- Job latency: enqueue-to-terminal state for queued operations.
- Sync freshness: latest successful provider sync compared to current time.
- Throughput: successful evaluation completions per minute under normal load.
- Webhook success: successful signed deliveries / total attempted deliveries.

## Breach Policy

- A breach opens a `go/no-go` blocker in the readiness board.
- Two consecutive breaches in 24h require incident review before release go.
