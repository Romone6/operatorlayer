import { describe, expect, it } from "vitest";

import { extractTextFromSource } from "@/lib/parsers";

describe("source parsers", () => {
  it("parses txt", async () => {
    const value = await extractTextFromSource("txt", { buffer: Buffer.from("Hello   world") });
    expect(value).toBe("Hello world");
  });

  it("parses csv", async () => {
    const value = await extractTextFromSource("csv", { buffer: Buffer.from("name,role\nAva,admin") });
    expect(value).toContain("Ava");
    expect(value).toContain("admin");
  });

  it("parses json", async () => {
    const value = await extractTextFromSource("json", { buffer: Buffer.from('{"a":1}') });
    expect(value).toContain('"a"');
  });

  it("parses pasted text", async () => {
    const value = await extractTextFromSource("pasted_text", { text: "  alpha   beta " });
    expect(value).toBe("alpha beta");
  });

  it("errors when pdf buffer missing", async () => {
    await expect(extractTextFromSource("pdf", {})).rejects.toThrow("File payload is required");
  });

  it("errors when docx buffer missing", async () => {
    await expect(extractTextFromSource("docx", {})).rejects.toThrow("File payload is required");
  });
});