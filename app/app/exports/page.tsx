"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/app/empty-state";
import { ErrorState } from "@/components/app/error-state";
import { ExportCard } from "@/components/app/export-card";
import { LoadingState } from "@/components/app/loading-state";
import { useApi } from "@/components/app/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ExportRecord } from "@/types/export";

export default function ExportsPage() {
  const exportsData = useApi<ExportRecord[]>("/api/exports", []);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const groupedExports = useMemo(() => exportsData.data ?? [], [exportsData.data]);

  async function generate() {
    setGenerating(true);
    setActionError(null);
    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: "full_pack" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to generate export pack");
      }
      await exportsData.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to generate export pack");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadArtifact(recordId: string, artifactName: string) {
    setActionError(null);
    try {
      const response = await fetch(`/api/exports/${recordId}/download?name=${encodeURIComponent(artifactName)}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? "Failed to download artifact");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = artifactName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to download artifact");
    }
  }

  async function verifyManifest(recordId: string) {
    setActionError(null);
    setVerifyMessage(null);
    try {
      const response = await fetch(`/api/exports/${recordId}/verify`);
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
        data?: {
          manifest: { checksumValid: boolean; signatureValid: boolean };
          artifactChecks: Array<{ valid: boolean }>;
        };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to verify manifest");
      }
      const artifactValid = payload.data.artifactChecks.every((item) => item.valid);
      setVerifyMessage(
        payload.data.manifest.checksumValid && payload.data.manifest.signatureValid && artifactValid
          ? "Manifest and artifact checksums verified."
          : "Verification failed for one or more artifacts/signatures."
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to verify manifest");
    }
  }

  if (exportsData.loading) return <LoadingState label="Loading exports..." />;
  if (exportsData.error) return <ErrorState message={exportsData.error} />;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Exports</h1>
        <Button onClick={generate} disabled={generating}>
          {generating ? "Generating..." : "Generate export pack"}
        </Button>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {!groupedExports.length ? (
        <EmptyState message="No exports generated yet." />
      ) : (
        groupedExports.map((record) => (
          <Card key={record.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-main)]">
                  {record.exportType} | {record.id}
                </p>
                <p className="text-xs text-[var(--color-text-soft)]">
                  Generated {new Date(record.createdAt).toLocaleString()} | {record.artifacts.length} artifacts
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-soft)]">
                  Version {record.manifest.version ?? "unversioned"} | Previous pack{" "}
                  {record.manifest.previousExportId ?? "none"} | Rollback checksum{" "}
                  {record.manifest.rollbackPointer?.previousChecksum?.slice(0, 12) ?? "none"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-soft)]">
                  Manifest checksum: {record.manifest.checksum.slice(0, 12)}...
                </p>
                <Button size="sm" variant="secondary" onClick={() => verifyManifest(record.id)}>
                  Verify manifest
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {record.artifacts.map((artifact) => {
                const key = `${record.id}:${artifact.name}`;
                const showPreview = previewKey === key;
                return (
                  <ExportCard
                    key={key}
                    name={artifact.name}
                    checksum={artifact.checksum}
                    preview={showPreview ? artifact.content?.slice(0, 400) : undefined}
                    onPreview={() => setPreviewKey(showPreview ? null : key)}
                    onDownload={() => downloadArtifact(record.id, artifact.name)}
                  />
                );
              })}
            </div>
          </Card>
        ))
      )}
      {verifyMessage ? <p className="text-sm text-emerald-300">{verifyMessage}</p> : null}
    </section>
  );
}
