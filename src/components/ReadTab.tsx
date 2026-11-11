import { useMemo, useState } from "react";
import { CHILD_FIELD_NAMES, FIELD_NAMES, parsePixPayload, PixPayloadError } from "../lib/pix/payload";

export function ReadTab() {
  const [code, setCode] = useState("");

  const result = useMemo(() => {
    if (!code.trim()) return null;
    try {
      return { parsed: parsePixPayload(code), error: "" };
    } catch (e) {
      if (e instanceof PixPayloadError) return { parsed: null, error: e.message };
      throw e;
    }
  }, [code]);

  const parsed = result?.parsed;

  return (
    <div className="card read">
      <label htmlFor="code">Cole um Pix Copia e Cola</label>
      <textarea
        id="code"
        rows={4}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="00020126..."
        spellCheck={false}
      />

      {result?.error && <p className="error" role="alert">{result.error}</p>}

      {parsed && (
        <div aria-live="polite">
          <div className="badges">
            <span className={`badge ${parsed.crc.valid ? "ok" : "bad"}`}>
              {parsed.crc.valid ? "CRC válido" : `CRC inválido (esperado ${parsed.crc.expected})`}
            </span>
            <span className={`badge ${parsed.isPix ? "ok" : "bad"}`}>{parsed.isPix ? "Arranjo Pix" : "Não é Pix"}</span>
            {parsed.singleUse && <span className="badge">Uso único</span>}
          </div>

          <dl className="summary">
            <dt>Recebedor</dt>
            <dd>{parsed.name ?? "—"}</dd>
            <dt>Cidade</dt>
            <dd>{parsed.city ?? "—"}</dd>
            <dt>Chave</dt>
            <dd className="mono">{parsed.key ?? "—"}</dd>
            <dt>Valor</dt>
            <dd>{parsed.amount ? `R$ ${parsed.amount.replace(".", ",")}` : "Definido por quem paga"}</dd>
            {parsed.description && (
              <>
                <dt>Mensagem</dt>
                <dd>{parsed.description}</dd>
              </>
            )}
            <dt>Identificador</dt>
            <dd className="mono">{parsed.txid ?? "—"}</dd>
          </dl>

          <details>
            <summary>Ver todos os campos EMV</summary>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Campo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {parsed.fields.flatMap((f) => [
                  <tr key={f.id}>
                    <td className="mono">{f.id}</td>
                    <td>{FIELD_NAMES[f.id] ?? "Desconhecido"}</td>
                    <td className="mono">{f.children ? "" : f.value}</td>
                  </tr>,
                  ...(f.children ?? []).map((c) => (
                    <tr key={`${f.id}-${c.id}`} className="child">
                      <td className="mono">{f.id}.{c.id}</td>
                      <td>{CHILD_FIELD_NAMES[f.id]?.[c.id] ?? "Desconhecido"}</td>
                      <td className="mono">{c.value}</td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </div>
  );
}
