"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleAlert, CircleDot, LockKeyhole } from "lucide-react";

export function ProductBrowserFrame({
  title,
  route,
  status = "Policy gate active",
  children,
  className,
}: {
  title: string;
  route?: string;
  status?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] shadow-[0_32px_110px_rgba(36,35,31,0.18)]", className)}>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#c8c0b2]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#d4b596]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#7d997d]" />
        <div className="ml-3 min-w-0 flex-1 text-xs text-[var(--color-text-soft)]">
          <span className="font-semibold text-[var(--color-text-main)]">{title}</span>
          {route ? <span className="ml-2 hidden sm:inline">/ {route}</span> : null}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          {status}
        </span>
      </div>
      {children}
    </div>
  );
}

export function ProductShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-[var(--color-background-panel)] p-5 md:p-6", className)}>{children}</div>;
}

export function ProductStatus({
  label,
  tone = "default",
  icon = true,
  className,
}: {
  label: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "accent" | "dark";
  icon?: boolean;
  className?: string;
}) {
  const tones = {
    default: "border-[var(--color-border)] bg-white text-[var(--color-text-muted)]",
    success: "border-[color:var(--color-success)]/35 bg-[color:var(--color-success)]/10 text-[var(--color-success)]",
    warning: "border-[color:var(--color-warning)]/35 bg-[color:var(--color-warning)]/10 text-[var(--color-warning)]",
    danger: "border-[color:var(--color-danger)]/35 bg-[color:var(--color-danger)]/10 text-[var(--color-danger)]",
    accent: "border-[color:var(--color-primary)]/35 bg-[color:var(--color-primary)]/10 text-[var(--color-primary-hover)]",
    dark: "border-white/10 bg-white/8 text-white/76",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? LockKeyhole : tone === "warning" ? CircleAlert : CircleDot;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

export function ProductRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}) {
  const tones = {
    default: "text-[var(--color-text-main)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
    accent: "text-[var(--color-primary-hover)]",
  };

  return (
    <div className="grid grid-cols-[0.8fr_1.2fr] gap-3 border-b border-[var(--color-border)] bg-white/72 px-3 py-2.5 text-sm last:border-b-0">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className={cn("font-semibold", tones[tone])}>{value}</span>
    </div>
  );
}

export function MiniBar({ label, value, tone = "accent" }: { label: string; value: number; tone?: "accent" | "success" | "warning" | "danger" }) {
  const colors = {
    accent: "bg-[var(--color-primary)]",
    success: "bg-[var(--color-success)]",
    warning: "bg-[var(--color-warning)]",
    danger: "bg-[var(--color-danger)]",
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-text-soft)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-background-soft)]">
        <div className={cn("h-full rounded-full", colors[tone])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ProductDataTable({
  columns,
  rows,
  dark = false,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  dark?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", dark ? "border-white/10" : "border-[var(--color-border)]")}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className={dark ? "bg-white/8 text-white/58" : "bg-[var(--color-background-soft)] text-[var(--color-text-soft)]"}>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={dark ? "divide-y divide-white/10" : "divide-y divide-[var(--color-border)]"}>
          {rows.map((row, index) => (
            <tr key={index} className={dark ? "bg-white/5 text-white/78" : "bg-white/76"}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cn("px-3 py-3 align-top", cellIndex === 0 && "font-semibold")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
