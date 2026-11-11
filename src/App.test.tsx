import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("generates a Pix Copia e Cola from the form", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Chave Pix"), "123e4567-e12b-12d1-a456-426655440000");
    await user.type(screen.getByLabelText("Nome de quem recebe"), "Fulano de Tal");
    await user.type(screen.getByLabelText("Cidade"), "BRASILIA");

    expect(screen.getByText("Detectado: Chave aleatória")).toBeInTheDocument();
    expect(screen.getByLabelText("Pix Copia e Cola")).toHaveValue(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("shows a friendly error for an invalid CPF", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Tipo de chave"), "cpf");
    await user.type(screen.getByLabelText("Chave Pix"), "123.456.789-00");
    await user.type(screen.getByLabelText("Nome de quem recebe"), "Ana");
    await user.type(screen.getByLabelText("Cidade"), "Bauru");

    expect(screen.getByRole("alert")).toHaveTextContent("CPF inválido.");
  });

  it("reads a payload and validates its CRC", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "Ler código" }));
    await user.click(screen.getByLabelText("Cole um Pix Copia e Cola"));
    await user.paste(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );

    expect(screen.getByText("CRC válido")).toBeInTheDocument();
    expect(screen.getByText("Recebedor").nextElementSibling).toHaveTextContent("Fulano de Tal");
  });
});
