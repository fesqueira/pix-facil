import { crc16 } from "./crc16";
import { EmvError, parseTlv, tlv, type EmvField } from "./emv";
import { normalizeKey, type PixKeyType } from "./keys";

/**
 * Static Pix payload ("Pix Copia e Cola") following the Banco Central
 * "Manual de Padrões para Iniciação do Pix" (BR Code, EMV MPM).
 */

export const PIX_GUI = "br.gov.bcb.pix";

export const LIMITS = {
  name: 25,
  city: 15,
  txid: 25,
  /** Field 26 (merchant account) may hold at most 99 characters in total. */
  merchantAccount: 99,
} as const;

export interface PixInput {
  keyType: PixKeyType;
  key: string;
  /** Receiver name, up to 25 characters. */
  name: string;
  /** Receiver city, up to 15 characters. */
  city: string;
  /** Amount in reais. Empty means the payer types the amount. */
  amount?: number;
  /** Transaction identifier, letters and digits, up to 25 characters. */
  txid?: string;
  /** Optional message shown to the payer by some banks. */
  description?: string;
  /** Marks the QR code as single use (field 01 = 12). */
  singleUse?: boolean;
}

export class PixPayloadError extends Error {}

/** Removes accents and anything outside printable ASCII, as the spec recommends. */
export function toPixText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PixPayloadError("O valor precisa ser maior que zero.");
  }
  if (amount > 9_999_999_999.99) {
    throw new PixPayloadError("Valor alto demais para um QR Code Pix.");
  }
  return amount.toFixed(2);
}

export function buildPixPayload(input: PixInput): string {
  const key = normalizeKey(input.keyType, input.key);

  const name = toPixText(input.name);
  const city = toPixText(input.city);
  if (!name) throw new PixPayloadError("Informe o nome de quem recebe.");
  if (!city) throw new PixPayloadError("Informe a cidade de quem recebe.");
  if (name.length > LIMITS.name) throw new PixPayloadError(`O nome pode ter no máximo ${LIMITS.name} caracteres.`);
  if (city.length > LIMITS.city) throw new PixPayloadError(`A cidade pode ter no máximo ${LIMITS.city} caracteres.`);

  const txid = (input.txid ?? "").trim() || "***";
  if (txid !== "***" && !/^[A-Za-z0-9]{1,25}$/.test(txid)) {
    throw new PixPayloadError("O identificador aceita só letras e números, até 25 caracteres.");
  }

  const description = toPixText(input.description ?? "");
  let merchantAccount = tlv("00", PIX_GUI) + tlv("01", key);
  if (description) merchantAccount += tlv("02", description);
  if (merchantAccount.length > LIMITS.merchantAccount) {
    const room = LIMITS.merchantAccount - (tlv("00", PIX_GUI) + tlv("01", key)).length - 4;
    throw new PixPayloadError(
      room > 0
        ? `Descrição longa demais para esta chave: use no máximo ${room} caracteres.`
        : "Esta chave não deixa espaço para descrição.",
    );
  }

  let payload =
    tlv("00", "01") +
    (input.singleUse ? tlv("01", "12") : "") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (input.amount !== undefined ? tlv("54", formatAmount(input.amount)) : "") +
    tlv("58", "BR") +
    tlv("59", name) +
    tlv("60", city) +
    tlv("62", tlv("05", txid));

  payload += "6304";
  return payload + crc16(payload);
}

/* ------------------------------------------------------------------ */
/* Reading a payload back                                              */
/* ------------------------------------------------------------------ */

export interface ParsedPix {
  key?: string;
  description?: string;
  name?: string;
  city?: string;
  amount?: string;
  txid?: string;
  singleUse: boolean;
  isPix: boolean;
  crc: { informed: string; expected: string; valid: boolean };
  fields: EmvField[];
}

const TEMPLATES = new Set(["26", "62"]);

/** Reads a "Pix Copia e Cola" string and checks its CRC. Throws PixPayloadError if it is not readable. */
export function parsePixPayload(code: string): ParsedPix {
  const input = code.trim();
  if (input.length < 20) throw new PixPayloadError("Código curto demais para ser um Pix Copia e Cola.");

  let fields: EmvField[];
  try {
    fields = parseTlv(input).map((f) => (TEMPLATES.has(f.id) ? { ...f, children: parseTlv(f.value) } : f));
  } catch (e) {
    if (e instanceof EmvError) throw new PixPayloadError(e.message);
    throw e;
  }

  const get = (id: string) => fields.find((f) => f.id === id);
  const account = get("26")?.children ?? [];
  const additional = get("62")?.children ?? [];
  const child = (list: EmvField[], id: string) => list.find((f) => f.id === id)?.value;

  const crcField = get("63");
  if (!crcField || !input.endsWith(crcField.value)) {
    throw new PixPayloadError("O código não termina com o campo de CRC (63).");
  }
  const expected = crc16(input.slice(0, -4));

  return {
    key: child(account, "01"),
    description: child(account, "02"),
    name: get("59")?.value,
    city: get("60")?.value,
    amount: get("54")?.value,
    txid: child(additional, "05"),
    singleUse: get("01")?.value === "12",
    isPix: child(account, "00")?.toLowerCase() === PIX_GUI,
    crc: { informed: crcField.value.toUpperCase(), expected, valid: crcField.value.toUpperCase() === expected },
    fields,
  };
}

/** Human-readable names of the BR Code fields, for the inspector table. */
export const FIELD_NAMES: Record<string, string> = {
  "00": "Versão do payload",
  "01": "Método de iniciação",
  "26": "Conta do recebedor (Pix)",
  "52": "Categoria do comerciante (MCC)",
  "53": "Moeda (986 = BRL)",
  "54": "Valor",
  "58": "País",
  "59": "Nome do recebedor",
  "60": "Cidade",
  "61": "CEP",
  "62": "Dados adicionais",
  "63": "CRC16",
};

export const CHILD_FIELD_NAMES: Record<string, Record<string, string>> = {
  "26": { "00": "Identificador (GUI)", "01": "Chave Pix", "02": "Descrição", "25": "URL (Pix dinâmico)" },
  "62": { "05": "Identificador da transação (TXID)" },
};
