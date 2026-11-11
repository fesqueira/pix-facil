/**
 * Pix key ("chave Pix") detection, validation and normalisation.
 *
 * Formats accepted by the Banco Central DICT:
 * - CPF: 11 digits, written without punctuation
 * - CNPJ: 14 digits, written without punctuation
 * - phone: +55 followed by DDD and number (E.164)
 * - email: lowercase
 * - random key (EVP): UUID v4 style, 36 characters
 */

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "evp";

export interface PixKeyResult {
  type: PixKeyType;
  /** The key exactly as it must go into the payload. */
  value: string;
}

export class PixKeyError extends Error {}

export const KEY_TYPE_LABEL: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  phone: "Celular",
  email: "E-mail",
  evp: "Chave aleatória",
};

const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const onlyDigits = (s: string) => s.replace(/\D/g, "");

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * Number(cnpj[i]), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

/** Normalises a key of a known type, or throws PixKeyError with a message for the user. */
export function normalizeKey(type: PixKeyType, raw: string): string {
  const input = raw.trim();

  switch (type) {
    case "cpf":
      if (!isValidCpf(input)) throw new PixKeyError("CPF inválido.");
      return onlyDigits(input);
    case "cnpj":
      if (!isValidCnpj(input)) throw new PixKeyError("CNPJ inválido.");
      return onlyDigits(input);
    case "phone": {
      let digits = onlyDigits(input);
      if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
      if (digits.length !== 10 && digits.length !== 11) {
        throw new PixKeyError("Celular inválido: use DDD + número, por exemplo (14) 99999-9999.");
      }
      return `+55${digits}`;
    }
    case "email":
      if (!EMAIL.test(input) || input.length > 77) throw new PixKeyError("E-mail inválido.");
      return input.toLowerCase();
    case "evp":
      if (!EVP.test(input)) throw new PixKeyError("Chave aleatória inválida: deve ter 36 caracteres (formato UUID).");
      return input.toLowerCase();
  }
}

/**
 * Guesses the key type from what the user typed. Ambiguous 11-digit numbers
 * are treated as CPF when the check digits match, otherwise as phone.
 */
export function detectKeyType(raw: string): PixKeyType | null {
  const input = raw.trim();
  if (!input) return null;
  if (EVP.test(input)) return "evp";
  if (input.includes("@")) return "email";
  if (input.startsWith("+")) return "phone";

  const digits = onlyDigits(input);
  if (digits.length === 14 && isValidCnpj(digits)) return "cnpj";
  if (digits.length === 11 && isValidCpf(digits)) return "cpf";
  if (digits.length >= 10 && digits.length <= 13) return "phone";
  return null;
}
