import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { detectKeyType, KEY_TYPE_LABEL, PixKeyError, type PixKeyType } from "../lib/pix/keys";
import { buildPixPayload, LIMITS, PixPayloadError } from "../lib/pix/payload";
import { CopyButton } from "./CopyButton";
import { parseAmount } from "../lib/amount";

const KEY_TYPES = Object.keys(KEY_TYPE_LABEL) as PixKeyType[];

const KEY_PLACEHOLDER: Record<PixKeyType, string> = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  phone: "(14) 99999-9999",
  email: "voce@exemplo.com",
  evp: "123e4567-e89b-12d3-a456-426614174000",
};

export function GenerateTab() {
  const [keyType, setKeyType] = useState<PixKeyType | "auto">("auto");
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [amount, setAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [description, setDescription] = useState("");
  const [singleUse, setSingleUse] = useState(false);
  const [qrImage, setQrImage] = useState({ payload: "", url: "" });

  const detected = keyType === "auto" ? detectKeyType(key) : keyType;

  const result = useMemo(() => {
    if (!key.trim() || !name.trim() || !city.trim()) return { payload: "", error: "" };
    if (!detected) return { payload: "", error: "Não reconheci o tipo da chave. Escolha o tipo na lista." };
    try {
      const payload = buildPixPayload({
        keyType: detected,
        key,
        name,
        city,
        amount: parseAmount(amount),
        txid,
        description,
        singleUse,
      });
      return { payload, error: "" };
    } catch (e) {
      if (e instanceof PixKeyError || e instanceof PixPayloadError) return { payload: "", error: e.message };
      throw e;
    }
  }, [detected, key, name, city, amount, txid, description, singleUse]);

  // The QR image is rendered asynchronously; it is kept together with the payload it
  // belongs to, so a stale image is never shown for a newer payload.
  useEffect(() => {
    if (!result.payload) return;
    let cancelled = false;
    QRCode.toDataURL(result.payload, { errorCorrectionLevel: "M", margin: 2, width: 640 }).then((url) => {
      if (!cancelled) setQrImage({ payload: result.payload, url });
    });
    return () => {
      cancelled = true;
    };
  }, [result.payload]);

  const qr = qrImage.payload === result.payload ? qrImage.url : "";

  return (
    <div className="grid">
      <form className="card form" onSubmit={(e) => e.preventDefault()} aria-label="Dados do Pix">
        <div className="field">
          <label htmlFor="key">Chave Pix</label>
          <div className="row">
            <select
              aria-label="Tipo de chave"
              value={keyType}
              onChange={(e) => setKeyType(e.target.value as PixKeyType | "auto")}
            >
              <option value="auto">Detectar</option>
              {KEY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {KEY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={detected ? KEY_PLACEHOLDER[detected] : "CPF, CNPJ, celular, e-mail ou chave aleatória"}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {keyType === "auto" && key.trim() && (
            <small className="hint">{detected ? `Detectado: ${KEY_TYPE_LABEL[detected]}` : "Tipo não reconhecido"}</small>
          )}
        </div>

        <div className="row two">
          <div className="field">
            <label htmlFor="name">Nome de quem recebe</label>
            <input id="name" value={name} maxLength={LIMITS.name + 10} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" />
            <small className="hint">{name.length}/{LIMITS.name}</small>
          </div>
          <div className="field">
            <label htmlFor="city">Cidade</label>
            <input id="city" value={city} maxLength={LIMITS.city + 10} onChange={(e) => setCity(e.target.value)} placeholder="Marília" />
            <small className="hint">{city.length}/{LIMITS.city}</small>
          </div>
        </div>

        <div className="row two">
          <div className="field">
            <label htmlFor="amount">Valor (opcional)</label>
            <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" />
          </div>
          <div className="field">
            <label htmlFor="txid">Identificador (opcional)</label>
            <input id="txid" value={txid} maxLength={LIMITS.txid} onChange={(e) => setTxid(e.target.value)} placeholder="PEDIDO123" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Mensagem (opcional)</label>
          <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Pedido 123" />
        </div>

        <label className="check">
          <input type="checkbox" checked={singleUse} onChange={(e) => setSingleUse(e.target.checked)} />
          QR Code de uso único
        </label>
      </form>

      <section className="card result" aria-live="polite" aria-label="Resultado">
        {result.error && <p className="error" role="alert">{result.error}</p>}
        {!result.payload && !result.error && (
          <div className="empty">
            <div className="qr-placeholder" aria-hidden="true" />
            <p>Preencha a chave, o nome e a cidade para gerar o QR Code.</p>
          </div>
        )}
        {result.payload && (
          <>
            {qr && <img className="qr" src={qr} alt="QR Code Pix" width={280} height={280} />}
            <label htmlFor="payload" className="label-sm">Pix Copia e Cola</label>
            <textarea id="payload" readOnly value={result.payload} rows={4} onFocus={(e) => e.currentTarget.select()} />
            <div className="actions">
              <CopyButton text={result.payload} />
              {qr && (
                <a className="button secondary" href={qr} download="pix-qrcode.png">
                  Baixar PNG
                </a>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
