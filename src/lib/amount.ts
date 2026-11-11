/** Parses "1.234,56", "1234.56" or "25" into a number of reais. Empty input gives undefined. */
export function parseAmount(raw: string): number | undefined {
  const text = raw.replace(/R\$\s?/i, "").trim();
  if (!text) return undefined;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized);
}
