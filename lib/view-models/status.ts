export function statusVariant(status: string): "success" | "warning" | "danger" | "violet" | "default" {
  const normalized = status.toLowerCase();
  if (["approved", "ready_to_suggest", "low", "safe"].includes(normalized)) return "success";
  if (["blocked", "rejected", "critical", "high"].includes(normalized)) return "danger";
  if (["weak", "needs_review", "medium", "review_required", "outdated"].includes(normalized)) return "warning";
  if (["suggested", "queued", "planned"].includes(normalized)) return "violet";
  return "default";
}

export function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

