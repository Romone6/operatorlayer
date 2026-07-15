export function normalizeWebhookEventType(eventType: string) {
  return eventType.trim().toLowerCase();
}

export function isWebhookEventSubscribed(subscriptions: string[], eventType: string) {
  const normalizedEvent = normalizeWebhookEventType(eventType);
  if (!normalizedEvent) return false;

  for (const raw of subscriptions) {
    const candidate = normalizeWebhookEventType(raw);
    if (!candidate) continue;
    if (candidate === "*") return true;
    if (candidate === normalizedEvent) return true;
    if (candidate.endsWith(".*")) {
      const prefix = candidate.slice(0, -1);
      if (normalizedEvent.startsWith(prefix)) return true;
    }
  }

  return false;
}
