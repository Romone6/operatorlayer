import { Badge } from "@/components/ui/badge";
import { statusVariant, formatStatus } from "@/lib/view-models/status";

export function RiskBadge({ risk }: { risk: string }) { return <Badge variant={statusVariant(risk)}>{formatStatus(risk)}</Badge>; }

