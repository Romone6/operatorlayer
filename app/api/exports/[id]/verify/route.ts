import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { getRequestContext } from "@/lib/auth/context";
import { AppError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { getRepository } from "@/lib/repository";

type Params = { params: Promise<{ id: string }> };

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sign(value: string) {
  const key = process.env.OPERATORLAYER_EXPORT_SIGNING_KEY;
  if (!key) {
    return hash(value);
  }
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const context = await getRequestContext(request);
    const { id } = await params;
    const repository = getRepository();
    const record = await repository.getExportById(context.organisationId, id);
    if (!record) {
      throw new AppError(404, "export_not_found", "Export not found.");
    }

    const sortedArtifacts = [...record.artifacts].sort((a, b) => a.name.localeCompare(b.name));
    const computedArtifacts = sortedArtifacts.map((artifact) => {
      const computed = hash(artifact.content);
      return {
        name: artifact.name,
        expected: artifact.checksum,
        computed,
        valid: computed === artifact.checksum,
      };
    });

    const manifestString = JSON.stringify(
      sortedArtifacts.map((artifact) => ({
        name: artifact.name,
        checksum: artifact.checksum,
      }))
    );
    const computedManifestChecksum = hash(manifestString);
    const computedSignature = sign(computedManifestChecksum);

    return jsonOk({
      exportId: record.id,
      artifactChecks: computedArtifacts,
      manifest: {
        version: record.manifest.version ?? null,
        previousExportId: record.manifest.previousExportId ?? null,
        artifactCount: record.manifest.artifactCount,
        computedArtifactCount: sortedArtifacts.length,
        artifactCountValid: record.manifest.artifactCount === sortedArtifacts.length,
        artifactNamesValid: record.manifest.artifactNames
          ? record.manifest.artifactNames.join("|") === sortedArtifacts.map((artifact) => artifact.name).join("|")
          : true,
        rollbackPointer: record.manifest.rollbackPointer ?? null,
        expectedChecksum: record.manifest.checksum,
        computedChecksum: computedManifestChecksum,
        expectedSignature: record.manifest.signature,
        computedSignature,
        checksumValid: computedManifestChecksum === record.manifest.checksum,
        signatureValid: computedSignature === record.manifest.signature,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
