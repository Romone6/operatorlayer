import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;

export function validateSourceFile(file: File) {
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new AppError(400, "source_file_too_large", "Source files must be 10 MB or smaller.");
  }
  if (!file.name || file.name.includes("..") || /[\\/]/.test(file.name)) {
    throw new AppError(400, "source_file_name_invalid", "Source file name is invalid.");
  }
}

export async function uploadSourceFile(params: {
  organisationId: string;
  sourceId: string;
  sourceType: string;
  fileName: string;
  data: Buffer;
}) {
  if (params.data.byteLength > MAX_SOURCE_FILE_BYTES) {
    throw new AppError(400, "source_file_too_large", "Source files must be 10 MB or smaller.");
  }
  if (!params.fileName || params.fileName.includes("..") || /[\\/]/.test(params.fileName)) {
    throw new AppError(400, "source_file_name_invalid", "Source file name is invalid.");
  }
  const storagePath = `${params.organisationId}/${params.sourceId}/${params.fileName}`;
  if (process.env.OPERATORLAYER_DATA_BACKEND === "memory") {
    return {
      storagePath,
    };
  }

  const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "operatorlayer-sources";
  const client = getSupabaseAdminClient();
  const { error } = await client.storage
    .from(bucketName)
    .upload(storagePath, params.data, { upsert: true, contentType: mimeByType(params.sourceType) });

  if (error) {
    throw new Error(`Failed to upload source file: ${error.message}`);
  }

  return { storagePath };
}

export async function deleteSourceFile(storagePath: string) {
  if (process.env.OPERATORLAYER_DATA_BACKEND === "memory") return;

  const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "operatorlayer-sources";
  const { error } = await getSupabaseAdminClient().storage.from(bucketName).remove([storagePath]);
  if (error) {
    throw new AppError(500, "source_file_delete_failed", "Failed to delete source file.", error);
  }
}

function mimeByType(sourceType: string) {
  switch (sourceType) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "markdown":
      return "text/markdown";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}
