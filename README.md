# OperatorLayer Frontend

OperatorLayer is a communication intelligence, evaluation, and governance layer for AI agents.

## Stack

- Next.js App Router
- TypeScript + React
- Tailwind CSS v4
- shadcn/ui primitives
- Framer Motion
- Lucide React
- Recharts
- React Hook Form + Zod
- Supabase Auth / Postgres / Storage

## Route Map

Public marketing:
- `/`
- `/product`
- `/solutions`
- `/integrations`
- `/docs`
- `/pricing`
- `/about`
- `/security`
- `/contact`

Authenticated app:
- `/app/overview`
- `/app/sources`
- `/app/source-governance`
- `/app/terminology`
- `/app/policies`
- `/app/review-queue`
- `/app/scenarios`
- `/app/scenarios/[id]`
- `/app/playground`
- `/app/evaluations`
- `/app/exports`
- `/app/settings`

## Development

```powershell
cd C:\OperatorLayer\operatorlayer-app
pnpm install
pnpm dev
```

## Verification

```powershell
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

## Deployment

Deploy on Vercel with environment variables from `.env.example`.
