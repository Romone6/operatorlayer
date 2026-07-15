import { Badge } from "@/components/ui/badge";
import { statusVariant, formatStatus } from "@/lib/view-models/status";

export function StatusBadge({ status }: { status: string }) { return <Badge variant={statusVariant(status)}>{formatStatus(status)}</Badge>; }

