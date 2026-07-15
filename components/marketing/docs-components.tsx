export function DocsCallout({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3 text-sm text-[var(--color-text-muted)]">{children}</div>;
}

export function EndpointCard({ method, path, description }: { method: string; path: string; description: string }) {
  return <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-panel)] p-4"><p className="text-xs text-[var(--color-primary-hover)]">{method}</p><p className="mt-1 font-semibold">{path}</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p></div>;
}
