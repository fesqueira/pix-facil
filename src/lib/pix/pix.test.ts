import { describe, expect, it } from "vitest";
import { crc16 } from "./crc16";
import { detectKeyType, isValidCnpj, isValidCpf, normalizeKey, PixKeyError } from "./keys";
import { buildPixPayload, parsePixPayload, PixPayloadError, toPixText } from "./payload";

/** Example payload from the Banco Central "Manual de Padrões para Iniciação do Pix". */
const BCB_EXAMPLE =
  "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("matches the CRC of the Banco Central example", () => {
    expect(crc16(BCB_EXAMPLE.slice(0, -4))).toBe("1D3D");
  });

  it("always returns 4 uppercase hex digits", () => {
    expect(crc16("")).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe("buildPixPayload", () => {
  it("reproduces the Banco Central example byte for byte", () => {
    const payload = buildPixPayload({
      keyType: "evp",
      key: "123e4567-e12b-12d1-a456-426655440000",
      name: "Fulano de Tal",
      city: "BRASILIA",
    });
    expect(payload).toBe(BCB_EXAMPLE);
  });

  it("adds amount, txid, description and single-use flag", () => {
    const payload = buildPixPayload({
      keyType: "email",
      key: "Contato@Exemplo.com",
      name: "Loja da Esquina",
      city: "Marília",
      amount: 25.5,
      txid: "PEDIDO123",
      description: "Pedido 123",
      singleUse: true,
    });

    expect(payload).toContain("010212");
    expect(payload).toContain("540525.50");
    expect(payload).toContain("contato@exemplo.com");
    expect(payload).toContain("6007Marilia");
    expect(payload).toContain("0509PEDIDO123");

    const parsed = parsePixPayload(payload);
    expect(parsed.crc.valid).toBe(true);
    expect(parsed.description).toBe("Pedido 123");
  });

  it("removes accents from name and city", () => {
    expect(toPixText("  João   Ção  ")).toBe("Joao Cao");
  });

  it("rejects names and cities above the limits", () => {
    const base = { keyType: "evp" as const, key: "123e4567-e12b-12d1-a456-426655440000", name: "Ana", city: "Bauru" };
    expect(() => buildPixPayload({ ...base, name: "A".repeat(26) })).toThrow(PixPayloadError);
    expect(() => buildPixPayload({ ...base, city: "C".repeat(16) })).toThrow(PixPayloadError);
  });

  it("rejects zero or negative amounts and invalid txid", () => {
    const base = { keyType: "evp" as const, key: "123e4567-e12b-12d1-a456-426655440000", name: "Ana", city: "Bauru" };
    expect(() => buildPixPayload({ ...base, amount: 0 })).toThrow("maior que zero");
    expect(() => buildPixPayload({ ...base, txid: "com espaço" })).toThrow(PixPayloadError);
  });

  it("keeps the merchant account field within 99 characters", () => {
    expect(() =>
      buildPixPayload({
        keyType: "evp",
        key: "123e4567-e12b-12d1-a456-426655440000",
        name: "Ana",
        city: "Bauru",
        description: "x".repeat(60),
      }),
    ).toThrow("Descrição longa demais");
  });
});

describe("parsePixPayload", () => {
  it("reads every field of the Banco Central example", () => {
    const parsed = parsePixPayload(BCB_EXAMPLE);
    expect(parsed).toMatchObject({
      isPix: true,
      key: "123e4567-e12b-12d1-a456-426655440000",
      name: "Fulano de Tal",
      city: "BRASILIA",
      txid: "***",
      amount: undefined,
      singleUse: false,
      crc: { valid: true, informed: "1D3D", expected: "1D3D" },
    });
  });

  it("detects a tampered payload through the CRC", () => {
    const tampered = BCB_EXAMPLE.replace("Fulano", "Fulana");
    const parsed = parsePixPayload(tampered);
    expect(parsed.crc.valid).toBe(false);
  });

  it("refuses text that is not a TLV payload", () => {
    expect(() => parsePixPayload("isto não é um pix, só um texto qualquer")).toThrow(PixPayloadError);
  });
});

describe("pix keys", () => {
  it("validates CPF and CNPJ check digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
  });

  it("normalises phone numbers to +55 E.164", () => {
    expect(normalizeKey("phone", "(14) 99999-8888")).toBe("+5514999998888");
    expect(normalizeKey("phone", "+55 14 99999-8888")).toBe("+5514999998888");
    expect(() => normalizeKey("phone", "1234")).toThrow(PixKeyError);
  });

  it("detects the key type from the typed value", () => {
    expect(detectKeyType("529.982.247-25")).toBe("cpf");
    expect(detectKeyType("11.222.333/0001-81")).toBe("cnpj");
    expect(detectKeyType("(14) 99999-8888")).toBe("phone");
    expect(detectKeyType("ana@exemplo.com")).toBe("email");
    expect(detectKeyType("123e4567-e12b-12d1-a456-426655440000")).toBe("evp");
    expect(detectKeyType("")).toBeNull();
  });
});
