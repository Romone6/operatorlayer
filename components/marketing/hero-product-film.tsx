"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { auditRows, productFilmSteps, scoreRows } from "@/src/remotion/data/demo-data";
import { cn } from "@/lib/utils";

const toneClass = {
  danger: "text-[var(--color-danger)] bg-[color:var(--color-danger)]/10 border-[color:var(--color-danger)]/30",
  warning: "text-[var(--color-warning)] bg-[color:var(--color-warning)]/10 border-[color:var(--color-warning)]/30",
  success: "text-[var(--color-success)] bg-[color:var(--color-success)]/10 border-[color:var(--color-success)]/30",
  accent: "text-[var(--color-primary-hover)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/30",
};

export function HeroProductFilm({ className }: { className?: string }) {
  const [readyVideo, setReadyVideo] = useState(false);
  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-dark)] shadow-[0_34px_120px_rgba(31,30,26,0.22)]", className)}>
      <video
        className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-500", readyVideo ? "opacity-100" : "opacity-0")}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/media/operant-product-demo-poster.png"
        onCanPlay={() => setReadyVideo(true)}
        onError={() => setReadyVideo(false)}
      >
        <source src="/media/operant-product-demo.mp4" type="video/mp4" />
      </video>
      <LiveProductFilm className={readyVideo ? "opacity-0" : "opacity-100"} />
    </div>
  );
}

function LiveProductFilm({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const step = productFilmSteps[index];

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((value) => (value + 1) % productFilmSteps.length), 3900);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className={cn("relative h-full min-h-[520px] bg-[radial-gradient(circle_at_80%_8%,rgba(201,111,58,0.2),transparent_34%),linear-gradient(135deg,#f3f1ea,#e9e3d7)] p-4 transition-opacity duration-500 md:min-h-[620px]", className)}>
      <div className="grid h-full overflow-hidden rounded-[1.55rem] border border-[var(--color-border)] bg-[var(--color-background-panel)] shadow-[0_28px_90px_rgba(36,35,31,0.14)] lg:grid-cols-[0.38fr_0.62fr]">
        <aside className="hidden border-r border-[var(--color-border)] bg-[var(--color-background-soft)] p-7 xl:block">
          <p className="section-label">Product film</p>
          <AnimatePresence mode="wait">
            <motion.div key={step.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.28 }}>
              <h3 className="mt-5 text-4xl font-semibold leading-[0.95] tracking-[-0.055em]">{step.title}</h3>
              <p className="mt-4 text-base leading-7 text-[var(--color-text-muted)]">{step.description}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-7 space-y-4">
            {scoreRows.map(([label, value, tone]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs text-[var(--color-text-soft)]"><span>{label}</span><span>{value}%</span></div>
                <div className="h-2 rounded-full bg-black/10"><motion.div key={`${step.id}-${label}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7 }} className={cn("h-full rounded-full", tone === "danger" ? "bg-[var(--color-danger)]" : tone === "warning" ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]")} /></div>
              </div>
            ))}
          </div>
        </aside>
        <main className="flex min-h-0 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c8c0b2]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d4b596]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#7d997d]" />
            <strong className="ml-2 text-sm">Operant</strong>
            <span className="hidden truncate text-sm text-[var(--color-text-soft)] sm:block">/ {step.windowTitle}</span>
            <span className={cn("ml-auto rounded-full border px-3 py-1 text-xs font-semibold", toneClass[step.tone])}>{step.status}</span>
          </div>
          <div className="grid flex-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <AnimatePresence mode="wait">
              <motion.section key={`${step.id}-primary`} initial={{ opacity: 0, scale: 0.97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -10 }} transition={{ duration: 0.32 }} className="rounded-[1.35rem] border border-[var(--color-border)] bg-white p-5 md:p-6">
                <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneClass[step.tone])}>{step.status}</span>
                <h3 className="mt-5 text-3xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-4xl">{step.primary}</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)] md:text-base">{step.secondary}</p>
              </motion.section>
            </AnimatePresence>
            <div className="rounded-[1.35rem] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
              <p className="text-sm font-semibold">Audit stream</p>
              <div className="mt-3 space-y-2">
                {auditRows.slice(0, Math.min(auditRows.length, index + 2)).map((row, rowIndex) => (
                  <motion.div key={row} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: rowIndex * 0.055 }} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-panel)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text-muted)]">
                    {row}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--color-dark)] p-4 text-white">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold">Draft -&gt; policy -&gt; risk -&gt; review -&gt; repair/export -&gt; audit</p>
              <div className="flex gap-1.5">
                {productFilmSteps.map((item, dot) => <span key={item.id} className={cn("h-2 rounded-full transition-all", dot === index ? "w-8 bg-[var(--color-primary)]" : dot < index ? "w-2 bg-white/55" : "w-2 bg-white/18")} />)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
