import { expect, test } from "@playwright/test";

test("contact page exposes Calendly demo booking and security context", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("heading", { name: "Book an Operant demo through Calendly." })).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: /Book a demo/i })).toBeVisible();
  await expect(page.getByText("What to bring")).toBeVisible();
  await expect(page.getByText("permissioned ingestion", { exact: false })).toBeVisible();
});

