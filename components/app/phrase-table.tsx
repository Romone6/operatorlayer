import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/app/status-badge";
import type { Terminology } from "@/types/terminology";

function evidenceLabel(item: { sourceId: string; chunkIndex?: number }) {
  return item.chunkIndex === undefined
    ? `Source ${item.sourceId}`
    : `Source ${item.sourceId} (chunk ${item.chunkIndex})`;
}

export function PhraseTable({ data }: { data: Terminology[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Phrase</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Scenario</TableHead>
          <TableHead>Source evidence</TableHead>
          <TableHead>Recommendation</TableHead>
          <TableHead>Replacement</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.phrase}</TableCell>
            <TableCell>{row.frequency}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>{row.scenarioId ?? "-"}</TableCell>
            <TableCell className="max-w-64">
              <div className="space-y-1 text-xs text-[var(--color-text-soft)]">
                {row.sourceEvidence.length > 0 ? (
                  row.sourceEvidence.map((item, index) => (
                    <p key={`${row.id}-evidence-${index}`}>{evidenceLabel(item)}</p>
                  ))
                ) : (
                  <p>No evidence</p>
                )}
              </div>
            </TableCell>
            <TableCell>{row.recommendation ?? "-"}</TableCell>
            <TableCell>
              {row.status === "blocked" || row.status === "weak"
                ? row.recommendation ?? "Requires replacement"
                : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
