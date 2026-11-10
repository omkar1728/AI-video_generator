import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Icon, IconBadge, SceneTitle, bulletIcon, bulletText, revealFrame, useIn } from "./theme";
import type { SceneBodyProps } from "./scenes1";

const PAD = 90;

/* ---------- Compare ---------- */
export const CompareScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const sides = [scene.left, scene.right];
  const vs = useIn(Math.round(frames * 0.3), 10);
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 60 }}>
      <SceneTitle title={scene.title} icon={scene.icon ?? "git-compare"} accent={accent} size={46} />
      <div style={{ display: "flex", gap: 40, marginTop: 34, flex: 1, position: "relative", alignItems: "stretch", paddingBottom: 30 }}>
        {sides.map((s, si) => {
          if (!s) return null;
          const col = accent[si];
          const head = useIn(si === 0 ? 6 : Math.round(frames * 0.3));
          return (
            <div key={si} style={{
              flex: 1, borderRadius: 26, padding: 30, background: "var(--card)",
              border: `2px solid ${col}77`, boxShadow: `0 0 40px ${col}22`, opacity: head,
              transform: `translateY(${(1 - head) * 40}px)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
                <IconBadge name={s.icon ?? (si ? "zap" : "box")} size={64} accent={si ? [accent[1], accent[0]] : accent} />
                <span style={{ fontSize: 40, fontWeight: 800, color: col }}>{s.title}</span>
              </div>
              {s.items.map((it, i) => {
                const base = si === 0 ? 0.1 : 0.34;
                const p = useIn(revealFrame(i, s.items.length, frames, base, 0.22));
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, marginBottom: 30, opacity: p, transform: `translateX(${(1 - p) * (si ? 50 : -50)}px)` }}>
                    <Icon name={bulletIcon(it, "check")} size={40} color={col} />
                    <span>{bulletText(it)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div style={{
          position: "absolute", left: "50%", top: "42%", width: 84, height: 84, marginLeft: -42, borderRadius: 42,
          background: "var(--panel)", border: `3px solid ${accent[0]}`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 32, fontWeight: 900, transform: `scale(${vs})`, boxShadow: `0 0 30px ${accent[0]}88`,
        }}>VS</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Stats ---------- */
export const StatsScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const frame = useCurrentFrame();
  const stats = scene.stats ?? [];
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 60 }}>
      <SceneTitle title={scene.title} icon={scene.icon ?? "bar-chart-3"} accent={accent} size={46} />
      <div style={{ display: "flex", gap: 36, flex: 1, alignItems: "center", justifyContent: "center" }}>
        {stats.map((s, i) => {
          const start = revealFrame(i, stats.length, frames, 0.1, 0.4);
          const p = useIn(start);
          const m = s.value.match(/^([^\d-]*)(-?[\d,.]+)(.*)$/);
          let shown = s.value;
          if (m) {
            const target = parseFloat(m[2].replace(/,/g, ""));
            const dec = (m[2].split(".")[1] ?? "").length;
            const v = interpolate(frame, [start, start + 40], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            shown = `${m[1]}${v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${m[3]}`;
          }
          const col = accent[i % 2];
          return (
            <div key={i} style={{
              flex: 1, maxWidth: 380, padding: "40px 20px", borderRadius: 28, textAlign: "center",
              background: "var(--card)", border: `2px solid ${col}77`, boxShadow: `0 0 50px ${col}33`,
              opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.9 + 0.1 * p})`,
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <IconBadge name={s.icon ?? "trending-up"} size={80} accent={accent} progress={p} />
              </div>
              <div style={{ fontSize: 96, fontWeight: 900, color: col, lineHeight: 1 }}>{shown}</div>
              <div style={{ fontSize: 32, marginTop: 16, color: "var(--text)" }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Image ---------- */
export const ImageScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const frame = useCurrentFrame();
  const p = useIn(4, 16);
  const zoom = interpolate(frame, [0, frames], [1.02, 1.14]);
  const items = scene.bullets ?? [];
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 60 }}>
      <SceneTitle title={scene.title} icon={scene.icon ?? "image"} accent={accent} size={46} />
      <div style={{ display: "flex", gap: 44, marginTop: 30, flex: 1, paddingBottom: 20 }}>
        <div style={{
          flex: items.length ? 1.5 : 1, position: "relative", borderRadius: 26, overflow: "hidden",
          border: `2px solid ${accent[0]}88`, boxShadow: `0 0 50px ${accent[0]}33`, opacity: p,
          transform: `scale(${0.94 + 0.06 * p})`, background: "var(--panel)",
        }}>
          {scene.image ? <Img src={staticFile(scene.image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} /> : null}
          {scene.credit ? (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "8px 16px", fontSize: 16, color: "#e2e8f0", background: "rgba(0,0,0,0.6)" }}>
              {scene.credit}
            </div>
          ) : null}
        </div>
        {items.length ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
            {items.map((b, i) => {
              const q = useIn(revealFrame(i, items.length, frames));
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 600, opacity: q, transform: `translateX(${(1 - q) * 60}px)` }}>
                  <IconBadge name={bulletIcon(b, "arrow-right")} size={54} accent={accent} progress={q} />
                  {bulletText(b)}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Hand-drawn SVG (draw-on animation) ---------- */
const DRAWABLE = "path,line,polyline,polygon,circle,ellipse,rect";

export const SvgScene: React.FC<SceneBodyProps> = ({ scene, accent, frames }) => {
  const frame = useCurrentFrame();
  const doc = useMemo(() => {
    const d = new DOMParser().parseFromString(scene.svg ?? "<svg/>", "image/svg+xml");
    return d.documentElement;
  }, [scene.svg]);
  const markup = useMemo(() => {
    const root = doc.cloneNode(true) as SVGSVGElement;
    const els = Array.from(root.querySelectorAll(DRAWABLE));
    const drawEnd = frames * 0.62;
    const per = drawEnd / Math.max(1, els.length);
    els.forEach((el, i) => {
      const start = 8 + i * per * 0.6;
      const dur = Math.max(14, per * 1.6);
      const t = Math.max(0, Math.min(1, (frame - start) / dur));
      const hasFill = (el.getAttribute("fill") ?? "none") !== "none";
      el.setAttribute("pathLength", "1");
      el.setAttribute("stroke-dasharray", "1");
      el.setAttribute("stroke-dashoffset", String(1 - t));
      if (!el.getAttribute("stroke")) el.setAttribute("stroke", accent[i % 2]);
      if (!el.getAttribute("stroke-width")) el.setAttribute("stroke-width", "3");
      el.setAttribute("stroke-linecap", "round");
      el.setAttribute("stroke-linejoin", "round");
      if (hasFill) el.setAttribute("fill-opacity", String(Math.max(0, (t - 0.6) / 0.4)));
    });
    root.setAttribute("width", "100%");
    root.setAttribute("height", "100%");
    root.querySelectorAll("text").forEach((el, i) => {
      el.setAttribute("opacity", String(Math.max(0, Math.min(1, (frame - frames * 0.35 - i * 6) / 12))));
      if (!el.getAttribute("fill")) el.setAttribute("fill", "var(--text)");
    });
    return new XMLSerializer().serializeToString(root);
  }, [doc, frame, frames, accent]);
  const items = scene.bullets ?? [];
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 60 }}>
      <SceneTitle title={scene.title} icon={scene.icon ?? "pen-tool"} accent={accent} size={46} />
      <div style={{ display: "flex", gap: 40, flex: 1, alignItems: "center", paddingBottom: 20 }}>
        <div style={{ flex: 1.6, height: "100%", maxHeight: 460, borderRadius: 26, border: `2px solid ${accent[0]}55`, background: "var(--card)", padding: 20 }}
          dangerouslySetInnerHTML={{ __html: markup }} />
        {items.length ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
            {items.map((b, i) => {
              const q = useIn(revealFrame(i, items.length, frames, 0.3, 0.4));
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 600, opacity: q, transform: `translateX(${(1 - q) * 50}px)` }}>
                  <IconBadge name={bulletIcon(b, "arrow-right")} size={52} accent={accent} progress={q} />
                  {bulletText(b)}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
