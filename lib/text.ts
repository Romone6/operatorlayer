export function normalizeWhitespace(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function chunkText(text: string, maxChars = 1200): string[] {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxChars) return [normalized];

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxChars && current.trim().length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }

  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

export function extractFrequentPhrases(chunks: string[], topN = 30) {
  const counts = new Map<string, number>();

  for (const chunk of chunks) {
    const cleaned = chunk.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    const tokens = cleaned.split(/\s+/).filter((token) => token.length > 2);

    for (let i = 0; i < tokens.length - 2; i += 1) {
      const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (trigram.length < 10) continue;
      counts.set(trigram, (counts.get(trigram) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([phrase, frequency]) => ({ phrase, frequency }));
}
