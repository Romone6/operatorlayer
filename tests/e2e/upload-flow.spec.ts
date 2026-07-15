import { expect, test } from "@playwright/test";

test("upload to extracted records flow", async ({ page }) => {
  await page.goto("/app/sources");
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();

  await page.getByLabel("Title").fill("E2E Manual");
  await page.getByLabel("Source Type").selectOption("pasted_text");
  await page
    .getByLabel("Pasted Text Content")
    .fill(
      "Price is too high. Based on what you shared, a scoped pilot may help. Price is too high. Based on what you shared, a scoped pilot may help."
    );
  await page.getByRole("button", { name: "Upload and Process" }).click();

  await expect(page.getByText("Source uploaded and processing started.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("E2E Manual")).toBeVisible();
  await expect(page.getByText("extracted")).toBeVisible();

  await page.goto("/app/policies");
  await expect(page.getByRole("heading", { name: /pricing_objection/i })).toBeVisible();

  await page.goto("/app/terminology");
  await expect(page.locator("tbody tr").first()).toBeVisible();
});
