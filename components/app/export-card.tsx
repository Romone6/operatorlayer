import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ExportCardProps = {
  name: string;
  checksum: string;
  preview?: string;
  disabled?: boolean;
  onPreview?: () => void;
  onDownload?: () => void;
};

export function ExportCard({ name, checksum, preview, disabled, onPreview, onDownload }: ExportCardProps) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-[var(--color-text-soft)]">{checksum.slice(0, 12)}...</p>
      </div>
      {preview ? (
        <pre className="max-h-24 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background-panel)]/70 p-2 text-xs text-[var(--color-text-soft)]">
          {preview}
        </pre>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onPreview}>
          Preview
        </Button>
        <Button size="sm" disabled={disabled} onClick={onDownload}>
          Download
        </Button>
      </div>
    </Card>
  );
}
