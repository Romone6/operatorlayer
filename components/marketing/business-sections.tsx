import Link from "next/link";

import { CalendlyButton } from "@/components/marketing/calendly-button";
import { alternativeRows, customerStoryPlaceholders, featureRows, integrationLogos, pricingPlans } from "@/components/marketing/operant-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {pricingPlans.map((plan) => (
        <Card key={plan.name} className={`p-6 ${plan.highlighted ? "border-[var(--color-primary)] shadow-[0_22px_70px_rgba(201,111,58,0.16)]" : ""}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{plan.description}</p>
            </div>
            {plan.highlighted ? <Badge variant="accent">Most common</Badge> : null}
          </div>
          <p className="mt-8 text-4xl font-semibold tracking-[-0.04em]">{plan.price}</p>
          <ul className="mt-6 space-y-3 text-sm text-[var(--color-text-muted)]">
            {plan.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-[var(--color-success)]">✓</span>{feature}</li>)}
          </ul>
          <CalendlyButton variant={plan.highlighted ? "accent" : "secondary"} className="mt-8 w-full" label={plan.cta} />
        </Card>
      ))}
    </div>
  );
}

export function ComparisonTable() {
  const availability = (row: string, plan: string) => {
    if (plan === "Starter") return ["Policy-backed outputs", "Evaluation scoring", "Exportable policy packs"].includes(row) ? "Included" : "Limited";
    if (plan === "Team") return row === "Integrations" || row === "Security controls" ? "Limited" : "Included";
    return "Included";
  };
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Capability</TableHead>
            <TableHead>Starter</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Enterprise</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {featureRows.map((row) => (
            <TableRow key={row}>
              <TableCell className="font-medium">{row}</TableCell>
              {[
                "Starter",
                "Team",
                "Enterprise",
              ].map((plan) => <TableCell key={plan} className="text-[var(--color-text-muted)]">{availability(row, plan)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function AlternativeComparisonTable() {
  return (
    <Card id="alternatives" className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Structural difference</TableHead>
            <TableHead>Manual review</TableHead>
            <TableHead>Generic prompt libraries</TableHead>
            <TableHead>Zapier-style automation</TableHead>
            <TableHead>Operant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alternativeRows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-[var(--color-text-muted)]">{row.manual}</TableCell>
              <TableCell className="text-[var(--color-text-muted)]">{row.prompt}</TableCell>
              <TableCell className="text-[var(--color-text-muted)]">{row.automation}</TableCell>
              <TableCell className="font-semibold text-[var(--color-success)]">{row.operant}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function PricingFAQ() {
  const faqs = [
    ["Is there a free trial?", "Pricing is demo-led for now because the product is governance infrastructure and should be configured against real policies, sources, and approval boundaries."],
    ["Are connectors live by default?", "No. Upload/API workflows are available first. Provider connectors require OAuth credentials, tenant setup, and explicit readiness checks before production use."],
    ["Does Operant send messages automatically?", "No. The MVP drafts, evaluates, repairs, approves, and exports. Hidden auto-send behaviour is not part of the MVP."],
    ["Can you support enterprise security review?", "Yes. Enterprise review can map controls, data boundaries, approval gates, audit logs, and readiness evidence."],
  ];
  return <div className="grid gap-4 md:grid-cols-2">{faqs.map(([q, a]) => <Card key={q} className="p-5"><h3 className="text-xl font-semibold">{q}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{a}</p></Card>)}</div>;
}

export function CustomerStoryGrid() {
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      {customerStoryPlaceholders.map((story) => (
        <Card key={story.company} className="p-5">
          <Badge variant="default">{story.category}</Badge>
          <h3 className="mt-5 text-2xl font-semibold">{story.company}</h3>
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-main)]">{story.metric}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{story.story}</p>
          <p className="mt-3 text-xs text-[var(--color-text-soft)]">{story.role}</p>
        </Card>
      ))}
    </div>
  );
}

export function HonestLogoWall() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {integrationLogos.slice(0, 8).map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-background-soft)] text-[var(--color-primary-hover)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="text-xs text-[var(--color-text-soft)]">Integration ecosystem</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function IntegrationGridDetailed() {
  const categories = ["Communication", "CRM", "Support", "Docs/Knowledge", "Developer tools", "Finance/Billing"] as const;
  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category}>
          <h2 className="text-2xl font-semibold">{category}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrationLogos.filter((item) => item.category === category).map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.name} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-background-soft)] text-[var(--color-primary-hover)]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                    <Badge variant={item.status === "Available" ? "success" : item.status === "Enterprise setup required" ? "warning" : "default"}>{item.status}</Badge>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{item.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SecurityTrustBlock() {
  return (
    <Card className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <Badge variant="accent">Security review ready</Badge>
        <h2 className="mt-4 text-3xl font-semibold">Designed for controlled adoption, not unchecked automation.</h2>
      </div>
      <div className="space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
        <p>Operant supports permissioned ingestion, source-level controls, human review, approval gates, and audit logs.</p>
        <p>Compliance discussions are grounded in controls, data boundaries, review workflows, auditability, and the security roadmap.</p>
      </div>
    </Card>
  );
}

export function PageCTA({ title, body, secondaryHref = "/pricing", secondaryLabel = "View pricing" }: { title: string; body: string; secondaryHref?: string; secondaryLabel?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <Card className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CalendlyButton variant="accent" />
          <Button asChild variant="secondary"><Link href={secondaryHref}>{secondaryLabel}</Link></Button>
        </div>
      </Card>
    </section>
  );
}
