import { useState } from "react";
import { GenerateTab } from "./components/GenerateTab";
import { ReadTab } from "./components/ReadTab";

type Tab = "generate" | "read";

export default function App() {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="page">
      <header className="header">
        <span className="logo" aria-hidden="true">◆</span>
        <div>
          <h1>
            Pix <span>Fácil</span>
          </h1>
          <p>Gere e confira QR Codes Pix seguindo a especificação BR Code do Banco Central.</p>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Modo">
        <button
          role="tab"
          aria-selected={tab === "generate"}
          className={tab === "generate" ? "active" : ""}
          onClick={() => setTab("generate")}
        >
          Gerar QR Code
        </button>
        <button
          role="tab"
          aria-selected={tab === "read"}
          className={tab === "read" ? "active" : ""}
          onClick={() => setTab("read")}
        >
          Ler código
        </button>
      </div>

      <main>{tab === "generate" ? <GenerateTab /> : <ReadTab />}</main>

      <footer className="footer">
        <p>🔒 Tudo acontece no seu navegador: nenhum dado é enviado a servidor algum.</p>
        <p>
          Feito por <a href="https://www.linkedin.com/in/felipe-rodrigues-siqueira-00694a369/">Felipe Siqueira</a> ·{" "}
          <a href="https://github.com/fesqueira/pix-facil">código no GitHub</a>
        </p>
      </footer>
    </div>
  );
}
