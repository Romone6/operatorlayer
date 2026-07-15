import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function uploadSourceFile(params: {
  organisationId: string;
  sourceId: string;
  sourceType: string;
  fileName: string;
  data: Buffer;
}) {
  if (process.env.OPERATORLAYER_DATA_BACKEND === "memory") {
    return {
      fileUrl: `memory://sources/${params.organisationId}/${params.sourceId}/${params.fileName}`,
    };
  }

  const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "operatorlayer-sources";
  const client = getSupabaseAdminClient();
  const path = `${params.organisationId}/${params.sourceId}/${params.fileName}`;
  const { error } = await client.storage
    .from(bucketName)
    .upload(path, params.data, { upsert: true, contentType: mimeByType(params.sourceType) });

  if (error) {
    throw new Error(`Failed to upload source file: ${error.message}`);
  }

  const { data } = client.storage.from(bucketName).getPublicUrl(path);
  return { fileUrl: data.publicUrl };
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
