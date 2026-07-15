import { expect, test } from "@playwright/test";

test("homepage product-led sections expose interactive Operant workflows", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Teach AI agents how your company actually operates/i })).toBeVisible();

  await page.getByRole("tab", { name: /Policies/ }).click();
  await expect(page.getByText("Refund Policy v3").first()).toBeVisible();
  await expect(page.getByText("12 linked").first()).toBeVisible();

  await page.getByRole("tab", { name: /Scenarios/ }).click();
  await expect(page.getByText("Refund escalation").first()).toBeVisible();
  await expect(page.getByText("manager approval").first()).toBeVisible();

  await page.getByRole("tab", { name: /Audit/ }).click();
  await expect(page.getByText("Export blocked").first()).toBeVisible();
  await expect(page.getByText("approval missing").first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Works with the tools modern teams already use" })).toBeVisible();
  await expect(page.getByLabel("Microsoft").first()).toBeVisible();
  await expect(page.getByLabel("Slack").first()).toBeVisible();
  await expect(page.getByText("Operant control layer").first()).toBeVisible();
  await expect(page.getByText("Check, repair, approve, block, log.")).toBeVisible();
  await expect(page.locator("video").first()).toHaveAttribute("poster", "/media/operant-product-demo-poster.png");
  await expect(page.locator("video source").first()).toHaveAttribute("src", "/media/operant-product-demo.mp4");

  const productTour = page.getByTestId("product-tour");
  await productTour.scrollIntoViewIfNeeded();
  await productTour.getByRole("button", { name: /Govern/i }).click();
  await expect(productTour.getByText("Auto-send").first()).toBeVisible();
  await expect(productTour.getByText("MVP disabled").first()).toBeVisible();

  await page.getByRole("button", { name: /View workflow/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect(box?.height ?? 0).toBeLessThanOrEqual(900);
  await expect(dialog.getByText("Matched evidence")).toBeVisible();
  await expect(dialog.getByText("Incoming draft")).toBeVisible();
  await expect(dialog.getByText("Final output", { exact: true })).toBeVisible();
  await dialog.evaluate((node) => {
    node.scrollTo(0, node.scrollHeight);
  });
  await expect(dialog.getByText("Audit trail")).toBeVisible();
  await page.getByRole("button", { name: "Close scenario workflow" }).first().click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("Building with teams deploying agents into high-stakes workflows.")).toBeVisible();
  await expect(page.getByText("Map your first governed agent workflow.")).toBeVisible();
  await expect(page.getByText("Built for teams at every stage of agent deployment.")).toBeVisible();
  await expect(page.getByText("Validate")).toHaveCount(0);
  await expect(page.getByText("Metric pending")).toHaveCount(0);
  await expect(page.getByText("Customer story template")).toHaveCount(0);
  await expect(page.getByText("No customer claims without approved proof")).toHaveCount(0);
});
