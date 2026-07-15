import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type FilmStep, auditRows, scoreRows } from "../data/product-demo";

const colors = {
  background: "#f3f1ea",
  panel: "#fbfaf6",
  surface: "#ebe8df",
  border: "#d8d3c7",
  ink: "#24231f",
  muted: "#666157",
  soft: "#8a857a",
  accent: "#c96f3a",
  success: "#4f7f61",
  warning: "#a87932",
  danger: "#b84a4a",
  dark: "#1f1e1a",
};

const toneColor = (tone: FilmStep["tone"]) => colors[tone] ?? colors.accent;

export function FilmScene({ step, index }: { step: FilmStep; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  const slide = interpolate(entrance, [0, 1], [42, 0]);
  const fade = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const zoom = interpolate(frame, [0, 150], [0.985, 1.02], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 80% 10%, rgba(201,111,58,0.2), transparent 36%), linear-gradient(135deg, ${colors.background}, #e9e3d7)`, fontFamily: "Aptos, Segoe UI, sans-serif", color: colors.ink }}>
      <div style={{ position: "absolute", inset: 44, borderRadius: 44, border: `1px solid ${colors.border}`, background: "rgba(251,250,246,0.78)", overflow: "hidden", boxShadow: "0 44px 120px rgba(36,35,31,0.18)", opacity: fade, transform: `translateY(${slide}px) scale(${zoom})` }}>
        <div style={{ height: 62, borderBottom: `1px solid ${colors.border}`, background: colors.surface, display: "flex", alignItems: "center", gap: 12, padding: "0 28px" }}>
          <span style={{ width: 13, height: 13, borderRadius: 99, background: "#c8c0b2" }} />
          <span style={{ width: 13, height: 13, borderRadius: 99, background: "#d4b596" }} />
          <span style={{ width: 13, height: 13, borderRadius: 99, background: "#7d997d" }} />
          <strong style={{ marginLeft: 18, fontSize: 18 }}>Operant</strong>
          <span style={{ color: colors.soft, fontSize: 16 }}>/ {step.windowTitle}</span>
          <span style={{ marginLeft: "auto", border: `1px solid ${colors.border}`, borderRadius: 999, background: "white", padding: "8px 14px", fontSize: 14, color: colors.muted }}>{step.status}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "430px 1fr", height: "calc(100% - 62px)" }}>
          <aside style={{ padding: 42, borderRight: `1px solid ${colors.border}`, background: "rgba(235,232,223,0.7)" }}>
            <p style={{ margin: 0, color: toneColor(step.tone), fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{step.eyebrow}</p>
            <h2 style={{ margin: "22px 0 0", fontSize: 54, lineHeight: 0.96, letterSpacing: -2.8 }}>{step.title}</h2>
            <p style={{ margin: "22px 0 0", fontSize: 19, lineHeight: 1.55, color: colors.muted }}>{step.description}</p>
            <div style={{ marginTop: 36, display: "grid", gap: 12 }}>
              {scoreRows.map(([label, value, tone], rowIndex) => {
                const width = interpolate(frame, [rowIndex * 5 + 12, rowIndex * 5 + 38], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: colors.muted, marginBottom: 8 }}><span>{label}</span><span>{value}%</span></div>
                    <div style={{ height: 9, borderRadius: 99, background: "rgba(36,35,31,0.1)" }}><div style={{ height: "100%", width: `${width}%`, borderRadius: 99, background: colors[tone] }} /></div>
                  </div>
                );
              })}
            </div>
          </aside>

          <main style={{ padding: 42, display: "grid", gridTemplateRows: "1fr auto", gap: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
              <div style={{ border: `1px solid ${toneColor(step.tone)}44`, background: "white", borderRadius: 28, padding: 30, boxShadow: "0 24px 70px rgba(36,35,31,0.08)" }}>
                <div style={{ display: "inline-flex", padding: "8px 13px", borderRadius: 999, background: `${toneColor(step.tone)}18`, color: toneColor(step.tone), fontSize: 14, fontWeight: 800 }}>{step.status}</div>
                <h3 style={{ margin: "28px 0 0", fontSize: 43, lineHeight: 1.04, letterSpacing: -1.8 }}>{step.primary}</h3>
                <p style={{ margin: "22px 0 0", fontSize: 19, lineHeight: 1.55, color: colors.muted }}>{step.secondary}</p>
              </div>
              <div style={{ border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: 28, padding: 24, display: "grid", gap: 14 }}>
                {auditRows.slice(0, Math.min(auditRows.length, index + 2)).map((row, rowIndex) => {
                  const rowFade = interpolate(frame, [rowIndex * 7, rowIndex * 7 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return <div key={row} style={{ opacity: rowFade, border: `1px solid ${colors.border}`, background: colors.panel, borderRadius: 16, padding: "16px 18px", fontSize: 17, fontWeight: 700 }}>{row}</div>;
                })}
              </div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: 24, background: colors.dark, color: "white", padding: 24, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}>
              <div><strong style={{ fontSize: 21 }}>{"Draft -> policy -> risk -> review -> repair/export -> audit"}</strong><p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.58)", fontSize: 16 }}>Operant controls the boundary before AI work reaches customers.</p></div>
              <div style={{ display: "flex", gap: 8 }}>{[0, 1, 2, 3, 4, 5].map((dot) => <span key={dot} style={{ width: dot === index ? 34 : 10, height: 10, borderRadius: 99, background: dot <= index ? colors.accent : "rgba(255,255,255,0.18)" }} />)}</div>
            </div>
          </main>
        </div>
      </div>
    </AbsoluteFill>
  );
}
