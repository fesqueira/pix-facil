import { describe, expect, it } from "vitest";
import { parseAmount } from "./amount";

describe("parseAmount", () => {
  it("accepts Brazilian and international formats", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("R$ 25,00")).toBe(25);
    expect(parseAmount("10.5")).toBe(10.5);
  });

  it("returns undefined for empty input and NaN for text", () => {
    expect(parseAmount("  ")).toBeUndefined();
    expect(parseAmount("abc")).toBeNaN();
  });
});
