import { Card } from "@/components/ui/card";

export function SecurityTrustPanel() {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold">Security, privacy and control built in.</h3>
      <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-soft)]">
        <li>Permissioned ingestion and source-level controls</li>
        <li>Customer-owned data posture and deletion controls</li>
        <li>No auto-send in MVP and no hidden general-model training</li>
      </ul>
    </Card>
  );
}

