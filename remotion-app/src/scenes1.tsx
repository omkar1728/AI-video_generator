import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Highlight, themes } from "prism-react-renderer";
import type { Scene } from "./types";
import { Icon, IconBadge, MONO, SceneTitle, bulletIcon, bulletText, revealFrame, useIn } from "./theme";

export type SceneBodyProps = { scene: Scene; accent: [string, string]; frames: number };

const PAD = 90;

/* ---------- Title / Outro ---------- */
export const TitleScene: React.FC<SceneBodyProps & { outro?: boolean }> = ({ scene, accent, frames, outro }) => {
  const frame = useCurrentFrame();
  const pIcon = useIn(4, 14);
  const words = scene.title.split(" ");
  const sub = useIn(Math.round(frames * 0.22));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: PAD, textAlign: "center" }}>
      <div style={{ position: "relative", width: 200, height: 200, marginBottom: 34 }}>
        <svg width={200} height={200} style={{ position: "absolute", inset: 0 }}>
          <circle cx={100} cy={100} r={92} fill="none" stroke={accent[0]} strokeWidth={2} strokeDasharray="10 14"
            opacity={0.7} transform={`rotate(${frame * 0.8} 100 100)`} />
          <circle cx={100} cy={100} r={76} fill="none" stroke={accent[1]} strokeWidth={2} strokeDasharray="4 10"
            opacity={0.7} transform={`rotate(${-frame * 1.2} 100 100)`} />
          {outro
            ? [0, 1, 2, 3, 4, 5].map((i) => {
                const a = (i / 6) * Math.PI * 2 + frame * 0.03;
                return <circle key={i} cx={100 + Math.cos(a) * 92} cy={100 + Math.sin(a) * 92} r={5} fill={accent[i % 2]} />;
              })
            : null}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconBadge name={scene.icon ?? (outro ? "flag" : "sparkles")} size={110} accent={accent} progress={pIcon} />
        </div>
      </div>
      <h1 style={{ fontSize: words.length > 6 ? 62 : 82, fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: -2 }}>
        {words.map((w, i) => {
          const p = useIn(12 + i * 4);
          return (
            <span key={i} style={{
              display: "inline-block", marginRight: 18, opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
              background: `linear-gradient(90deg, var(--text), ${accent[i % 2 ? 1 : 0]})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>{w}</span>
          );
        })}
      </h1>
      {scene.subtitle ? (
        <p style={{ fontSize: 34, color: "var(--muted)", marginTop: 26, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`, maxWidth: 900 }}>
          {scene.subtitle}
        </p>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- Bullets ---------- */
export const BulletsScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const frame = useCurrentFrame();
  const items = scene.bullets ?? [];
  const hero = useIn(6, 14);
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 70 }}>
      <SceneTitle title={scene.title} icon={scene.icon} accent={accent} />
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 50, marginTop: 20 }}>
        <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: 22 }}>
          {items.map((b, i) => {
            const p = useIn(revealFrame(i, items.length, frames));
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 22, padding: "18px 26px", borderRadius: 22,
                background: "var(--card)", border: `1px solid ${accent[i % 2]}55`,
                opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-80, 0])}px)`,
                boxShadow: `0 0 30px ${accent[i % 2]}22`,
              }}>
                <IconBadge name={bulletIcon(b, "check")} size={64} accent={accent} progress={p} />
                <span style={{ fontSize: 42, fontWeight: 600 }}>{bulletText(b)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, position: "relative", height: 420, display: "flex", alignItems: "center", justifyContent: "center", opacity: hero, transform: `scale(${hero})` }}>
          <svg width={420} height={420} style={{ position: "absolute" }}>
            <circle cx={210} cy={210} r={170} fill="none" stroke={accent[0]} strokeOpacity={0.4} strokeWidth={2} strokeDasharray="6 12" transform={`rotate(${frame * 0.6} 210 210)`} />
            <circle cx={210} cy={210} r={120} fill="none" stroke={accent[1]} strokeOpacity={0.4} strokeWidth={2} transform={`rotate(${-frame * 0.9} 210 210)`} strokeDasharray="30 20" />
          </svg>
          <div style={{ transform: `scale(${1 + 0.05 * Math.sin(frame * 0.08)})` }}>
            <Icon name={scene.icon ?? "layers"} size={150} color={accent[0]} stroke={1.5} />
          </div>
          {items.slice(0, 5).map((b, i) => {
            const a = (i / Math.min(items.length, 5)) * Math.PI * 2 + frame * 0.012 - Math.PI / 2;
            const shown = useIn(revealFrame(i, items.length, frames));
            return (
              <div key={i} style={{ position: "absolute", left: 210 + Math.cos(a) * 170 - 26, top: 210 + Math.sin(a) * 170 - 26, opacity: shown }}>
                <IconBadge name={bulletIcon(b, "check")} size={52} accent={accent} />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Code ---------- */
export const CodeScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const win = useIn(4);
  const code = (scene.code ?? "").replace(/\n+$/, "");
  const lines = code.split("\n");
  const total = Math.max(1, code.length);
  const typeStart = frames * 0.1;
  const typeEnd = frames * 0.62;
  const typed = Math.floor(interpolate(frame, [typeStart, typeEnd], [0, total], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const hl = scene.highlight ?? [];
  const hlOn = frame > typeEnd;
  const hlP = useIn(Math.round(typeEnd));
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  const byWidth = Math.floor((width - PAD * 2 - 52 - 56) / (maxLen * 0.6));
  const fontSize = Math.max(16, Math.min(lines.length > 12 ? 24 : lines.length > 8 ? 28 : 32, byWidth));
  let consumed = 0;
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 60 }}>
      <SceneTitle title={scene.title} icon={scene.icon ?? "code"} accent={accent} size={46} />
      <div style={{
        marginTop: 26, borderRadius: 20, overflow: "hidden", background: "rgba(10,14,30,0.92)",
        border: `1px solid ${accent[0]}66`, boxShadow: `0 0 60px ${accent[0]}33`,
        opacity: win, transform: `translateY(${(1 - win) * 40}px) scale(${0.97 + 0.03 * win})`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "var(--card)" }}>
          {["#ff5f56", "#ffbd2e", "#27c93f"].map((c) => <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
          <span style={{ marginLeft: 14, fontFamily: MONO, fontSize: 20, color: "var(--muted)" }}>{scene.filename ?? scene.language ?? "code"}</span>
        </div>
        <Highlight theme={themes.vsDark} code={code} language={scene.language ?? "python"}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre style={{ margin: 0, padding: "22px 0", fontFamily: MONO, fontSize, lineHeight: 1.5, background: "transparent" }}>
              {tokens.map((line, li) => {
                const lineLen = line.reduce((n, t) => n + t.content.length, 0);
                const start = consumed;
                consumed += lineLen + 1;
                const visible = Math.max(0, Math.min(lineLen, typed - start));
                if (typed < start) return <div key={li} style={{ height: fontSize * 1.5 }} />;
                const isHl = hlOn && hl.includes(li + 1);
                let shownSoFar = 0;
                const typing = typed >= start && typed < start + lineLen + 1;
                return (
                  <div key={li} {...getLineProps({ line })} style={{
                    display: "flex", padding: "0 28px",
                    background: isHl ? `${accent[0]}26` : "transparent",
                    borderLeft: `5px solid ${isHl ? accent[0] : "transparent"}`,
                    opacity: hl.length && hlOn && !isHl ? 0.45 : 1,
                  }}>
                    <span style={{ width: 52, color: "var(--muted)", userSelect: "none", flexShrink: 0 }}>{li + 1}</span>
                    <span style={{ whiteSpace: "pre" }}>
                      {line.map((token, ti) => {
                        const take = Math.max(0, Math.min(token.content.length, visible - shownSoFar));
                        shownSoFar += token.content.length;
                        const props = getTokenProps({ token });
                        return <span key={ti} {...props}>{token.content.slice(0, take)}</span>;
                      })}
                      {typing && Math.floor(frame / 8) % 2 === 0 ? <span style={{ color: accent[0] }}>▍</span> : null}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
      {scene.caption ? (
        <div style={{ marginTop: 22, fontSize: 30, color: "var(--muted)", opacity: hlP, display: "flex", gap: 14, alignItems: "center" }}>
          <Icon name="lightbulb" size={34} color={accent[0]} /> {scene.caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- Diagram ---------- */
export const DiagramScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const nodes = (scene.nodes ?? []).map((n, i) => ({ ...n, col: n.col ?? i, row: n.row ?? 0 }));
  const edges = scene.edges ?? nodes.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;
  const areaW = width - PAD * 2;
  const areaH = height - 300;
  const cardW = Math.min(200, areaW / cols - 40);
  const cardH = 130;
  const pos = nodes.map((n) => ({
    x: cols === 1 ? areaW / 2 : (cardW / 2 + 10) + (n.col * (areaW - cardW - 20)) / (cols - 1),
    y: rows === 1 ? areaH / 2 : cardH / 2 + (n.row * (areaH - cardH)) / (rows - 1),
  }));
  const idx = (ref: string | number) => (typeof ref === "number" ? ref : nodes.findIndex((n) => n.id === ref || n.label === ref));
  const nodeStart = (i: number) => revealFrame(i, nodes.length, frames, 0.08, 0.6);
  const caption = useIn(Math.round(frames * 0.75));
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 60 }}>
      <SceneTitle title={scene.title} icon={scene.icon ?? "workflow"} accent={accent} size={46} />
      <div style={{ position: "relative", marginTop: 30, width: areaW, height: areaH }}>
        <svg width={areaW} height={areaH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {edges.map((e, k) => {
            const a = idx(e[0]); const b = idx(e[1]);
            if (a < 0 || b < 0) return null;
            const dx = pos[b].x - pos[a].x; const dy = pos[b].y - pos[a].y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len; const uy = dy / len;
            const pad = Math.abs(ux) > Math.abs(uy) ? cardW / 2 + 8 : cardH / 2 + 8;
            const x1 = pos[a].x + ux * pad; const y1 = pos[a].y + uy * pad;
            const x2 = pos[b].x - ux * pad; const y2 = pos[b].y - uy * pad;
            const start = nodeStart(b) - 8;
            const p = Math.max(0, Math.min(1, (frame - start) / 14));
            const ex = x1 + (x2 - x1) * p; const ey = y1 + (y2 - y1) * p;
            const t = ((frame - start) % 45) / 45;
            const label = e[2];
            return (
              <g key={k} opacity={p > 0 ? 1 : 0}>
                <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={accent[0]} strokeWidth={4} strokeLinecap="round" />
                {p >= 1 ? (
                  <>
                    <polygon points="0,-9 18,0 0,9" fill={accent[0]} transform={`translate(${x2 - ux * 14},${y2 - uy * 14}) rotate(${(Math.atan2(uy, ux) * 180) / Math.PI})`} />
                    <circle cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} r={7} fill="var(--text)" style={{ filter: `drop-shadow(0 0 8px ${accent[0]})` }} />
                  </>
                ) : null}
                {label && p >= 1 ? (
                  <g transform={`translate(${(x1 + x2) / 2},${(y1 + y2) / 2})`}><rect x={-label.length * 7 - 12} y={-18} width={label.length * 14 + 24} height={36} rx={18} fill="var(--panel)" stroke={accent[0]} /><text y={7} fill="var(--text)" fontSize={20} textAnchor="middle" fontWeight={600}>{label}</text></g>
                ) : null}
              </g>
            );
          })}
        </svg>
        {nodes.map((n, i) => {
          const p = useIn(nodeStart(i), 12);
          const pulse = frame > nodeStart(i) ? 0.5 + 0.5 * Math.sin((frame - nodeStart(i)) * 0.12) : 0;
          return (
            <div key={i} style={{
              position: "absolute", left: pos[i].x - cardW / 2, top: pos[i].y - cardH / 2, width: cardW, height: cardH,
              borderRadius: 24, background: "var(--panel)", border: `2px solid ${accent[i % 2]}`,
              boxShadow: `0 0 ${20 + pulse * 20}px ${accent[i % 2]}66`, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10, opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
            }}>
              <Icon name={n.icon ?? "box"} size={46} color={accent[i % 2]} />
              <span style={{ fontSize: 26, fontWeight: 700, textAlign: "center", lineHeight: 1.1 }}>{n.label}</span>
            </div>
          );
        })}
      </div>
      {scene.caption ? <div style={{ fontSize: 30, color: "var(--muted)", opacity: caption, textAlign: "center" }}>{scene.caption}</div> : null}
    </AbsoluteFill>
  );
};
