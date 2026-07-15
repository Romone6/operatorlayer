import { parse as parseCsv } from "csv-parse/sync";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

import { AppError } from "@/lib/errors";
import { normalizeWhitespace } from "@/lib/text";

export type SupportedSourceType = "pdf" | "docx" | "markdown" | "txt" | "csv" | "json" | "pasted_text";

export async function extractTextFromSource(
  sourceType: SupportedSourceType,
  payload: { buffer?: Buffer; text?: string }
): Promise<string> {
  if (sourceType === "pasted_text") {
    if (!payload.text) throw new AppError(400, "missing_text", "Pasted text content is required.");
    return normalizeWhitespace(payload.text);
  }

  if (!payload.buffer) {
    throw new AppError(400, "missing_file", `File payload is required for source_type=${sourceType}`);
  }

  if (sourceType === "pdf") {
    const parser = new PDFParse({ data: payload.buffer });
    const parsed = await parser.getText();
    return normalizeWhitespace(parsed.text);
  }

  if (sourceType === "docx") {
    const result = await mammoth.extractRawText({ buffer: payload.buffer });
    return normalizeWhitespace(result.value);
  }

  if (sourceType === "markdown" || sourceType === "txt") {
    return normalizeWhitespace(payload.buffer.toString("utf-8"));
  }

  if (sourceType === "json") {
    const object = JSON.parse(payload.buffer.toString("utf-8")) as Record<string, unknown>;
    return normalizeWhitespace(JSON.stringify(object, null, 2));
  }

  if (sourceType === "csv") {
    const rows = parseCsv(payload.buffer.toString("utf-8"), { columns: true, skip_empty_lines: true });
    return normalizeWhitespace(JSON.stringify(rows, null, 2));
  }

  throw new AppError(400, "unsupported_source_type", `Unsupported source type: ${sourceType}`);
}
