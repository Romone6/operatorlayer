import { CalendlyButton } from "@/components/marketing/calendly-button";
import { Card } from "@/components/ui/card";

export function CTASection({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-16">
      <Card className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
        <CalendlyButton variant="accent" />
      </Card>
    </section>
  );
}
