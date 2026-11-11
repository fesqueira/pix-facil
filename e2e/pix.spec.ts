import { expect, test } from "@playwright/test";

test("generates a QR code and reads it back", async ({ page }) => {
  await page.goto("./");

  await page.getByLabel("Chave Pix").fill("contato@exemplo.com");
  await page.getByLabel("Nome de quem recebe").fill("Loja da Esquina");
  await page.getByLabel("Cidade").fill("Marília");
  await page.getByLabel("Valor (opcional)").fill("19,90");

  await expect(page.getByAltText("QR Code Pix")).toBeVisible();
  const payload = await page.getByLabel("Pix Copia e Cola").inputValue();
  expect(payload).toContain("540519.90");

  await page.getByRole("tab", { name: "Ler código" }).click();
  await page.getByLabel("Cole um Pix Copia e Cola").fill(payload);
  await expect(page.getByText("CRC válido")).toBeVisible();
  await expect(page.getByText("R$ 19,90")).toBeVisible();
});
