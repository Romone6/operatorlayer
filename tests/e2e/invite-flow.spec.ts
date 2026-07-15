import { expect, test } from "@playwright/test";

test("invite token page accepts invite and redirects to app", async ({ page, request }) => {
  const createInviteResponse = await request.post("/api/members/invites", {
    data: {
      email: "test@example.com",
      role: "member",
    },
  });

  expect(createInviteResponse.ok()).toBeTruthy();
  const createInvitePayload = (await createInviteResponse.json()) as {
    data: { inviteToken: string };
  };
  const inviteToken = createInvitePayload.data.inviteToken;
  expect(inviteToken).toBeTruthy();

  await page.goto(`/invite/${inviteToken}`);
  await expect(page.getByRole("heading", { name: "Workspace invite" })).toBeVisible();
  await expect(page.getByText("Email: test@example.com")).toBeVisible();

  await page.getByRole("button", { name: "Accept invite" }).click();
  await expect(page).toHaveURL(/\/app\/overview$/);
});
