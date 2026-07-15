import { describe, expect, it } from "vitest";

import { isWebhookEventSubscribed } from "@/lib/services/webhook-subscriptions";

describe("webhook event subscriptions", () => {
  it("matches exact events case-insensitively", () => {
    expect(isWebhookEventSubscribed(["Evaluation.Created"], "evaluation.created")).toBe(true);
    expect(isWebhookEventSubscribed(["evaluation.created"], "evaluation.updated")).toBe(false);
  });

  it("supports wildcard subscriptions", () => {
    expect(isWebhookEventSubscribed(["*"], "send_event.created")).toBe(true);
    expect(isWebhookEventSubscribed(["send_event.*"], "send_event.created")).toBe(true);
    expect(isWebhookEventSubscribed(["send_event.*"], "evaluation.created")).toBe(false);
  });
});
