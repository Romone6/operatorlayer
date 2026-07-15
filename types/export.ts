export type ExportArtifact = {
  name: string;
  contentType: string;
  checksum: string;
  content?: string;
};

export type ExportRecord = {
  id: string;
  organisationId: string;
  exportType: string;
  artifacts: ExportArtifact[];
  manifest: {
    version?: number;
    previousExportId?: string | null;
    artifactCount: number;
    artifactNames?: string[];
    checksum: string;
    signature: string;
    signedAt: string;
    rollbackPointer?: {
      previousExportId: string | null;
      previousChecksum: string | null;
    };
  };
  createdAt: string;
};
