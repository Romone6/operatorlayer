import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function IntegrationGrid() {
  const items = [
    ["Secure uploads", "Available"],
    ["Manual exports", "Available"],
    ["Agent-ready policy packs", "Available"],
    ["Gmail", "Enterprise setup required"],
    ["Slack", "Enterprise setup required"],
    ["Outlook", "Planned"],
    ["HubSpot", "Planned"],
    ["Salesforce", "Planned"],
    ["MCP Server", "Available"],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(([name, status]) => (
        <Card key={name} className="flex items-center justify-between p-4">
          <span>{name}</span>
          <Badge variant={status === "Available" ? "success" : status === "Enterprise setup required" ? "warning" : "default"}>{status}</Badge>
        </Card>
      ))}
    </div>
  );
}
