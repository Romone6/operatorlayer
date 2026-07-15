import { CalendlyButton } from "@/components/marketing/calendly-button";
import { Card } from "@/components/ui/card";

export function PricingCard({ name, price, features, highlighted = false }: { name: string; price: string; features: string[]; highlighted?: boolean }) {
  return (
    <Card className={`p-6 ${highlighted ? "border-[var(--color-primary)]" : ""}`}>
      <h3 className="text-2xl font-semibold">{name}</h3>
      <p className="mt-2 text-3xl font-semibold">{price}</p>
      <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-muted)]">{features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
      <CalendlyButton variant={highlighted ? "accent" : "secondary"} className="mt-6 w-full" />
    </Card>
  );
}
