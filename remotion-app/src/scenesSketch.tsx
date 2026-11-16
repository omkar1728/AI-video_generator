/** Sketchnote (black board) versions of the scene layouts. Selected by theme.style === "sketchnote". */
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { SceneBodyProps } from "./scenes1";
import { bulletIcon, bulletText, revealFrame } from "./theme";
import { diagramLayout } from "./camera";
import {
  DrawIcon, FatArrow, HandText, InkArrow, Pen, SK, SketchBox, SketchTitle, Stroke, Swash, clamp01, easeOut, estWidth, prog,
  roughEllipse, roughLine,
} from "./sketch";

const PAD = 90;

/* ---------- Title / Outro ---------- */
export const SkTitleScene: React.FC<SceneBodyProps & { outro?: boolean }> = ({ scene, frames, outro }) => {
  const frame = useCurrentFrame();
  const size = scene.title.split(" ").length > 6 ? 62 : 78;
  const sparks = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
    return roughLine(110 + Math.cos(a) * 118, 110 + Math.sin(a) * 118, 110 + Math.cos(a) * 140, 110 + Math.sin(a) * 140, `sp${i}`, 0.8);
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: PAD, textAlign: "center" }}>
      <div style={{ position: "relative", width: 220, height: 220, marginBottom: 26 }}>
        <svg width={220} height={220} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <g transform="translate(10 10)">
            <Pen make={(s, a) => roughEllipse(100, 100, s, a)} seed="tcirc" p={easeOut(prog(frame, 2, 20))} w={3.5} amp={2.4} />
          </g>
          {(outro ? sparks : sparks.slice(0, 4)).map((d, i) => (
            <Stroke key={i} d={d} p={prog(frame, 22 + i * 3, 8)} w={5} color={SK.yellow} />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DrawIcon name={scene.icon ?? (outro ? "flag" : "sparkles")} size={110} start={10} dur={22} stroke={1.8} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ maxWidth: 1050 }}>
          <HandText text={scene.title} size={size} bold start={22} seed="title" />
        </div>
        <Swash w={Math.min(estWidth(scene.title, size), 900)} p={prog(frame, 22 + scene.title.length, 16)} seed="titlesw" weight={11} />
      </div>
      {scene.subtitle ? (
        <div style={{ marginTop: 26, maxWidth: 900 }}>
          <HandText text={scene.subtitle} size={34} color={SK.note} start={Math.round(frames * 0.22)} seed="sub" />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- Bullets ---------- */
export const SkBulletsScene: React.FC<SceneBodyProps> = ({ scene, frames }) => {
  const frame = useCurrentFrame();
  const items = scene.bullets ?? [];
  const n = items.length;
  const h = n >= 5 ? 74 : n === 4 ? 86 : 100;
  const gap = n >= 5 ? 16 : 22;
  const fs = n >= 5 ? 33 : n === 4 ? 37 : 40;
  const hero = prog(frame, 6, 22);
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 56 }}>
      <SketchTitle title={scene.title} icon={scene.icon} />
      <div style={{ position: "relative", flex: 1, marginTop: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          {items.map((b, i) => {
            const st = revealFrame(i, n, frames);
            return (
              <SketchBox key={i} w={700} h={h} seed={`b${scene.id}${i}`} p={prog(frame, st, 14)}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, height: "100%", padding: "0 24px" }}>
                  <DrawIcon name={bulletIcon(b, "check")} size={Math.round(h * 0.5)} start={st + 4} />
                  <HandText text={bulletText(b)} size={fs} start={st + 8} seed={`bt${scene.id}${i}`} />
                </div>
              </SketchBox>
            );
          })}
        </div>
        <div style={{ position: "absolute", right: 10, top: 10, width: 300, height: 320 }}>
          <svg width={300} height={320} style={{ position: "absolute", overflow: "visible" }}>
            <g transform="translate(20 20)">
              <ellipse cx={138} cy={138} rx={118} ry={118} fill={SK.g1} opacity={hero > 0 ? 1 : 0} />
              <Pen make={(s, a) => roughEllipse(125, 125, s, a)} seed={`hero${scene.id}`} p={easeOut(hero)} w={3.5} amp={2.6} />
            </g>
            {[0, 1, 2].map((i) => (
              <Stroke key={i} d={roughLine(240 + i * 14, 40 - i * 9, 262 + i * 14, 18 - i * 9, `hs${i}`, 0.6)} p={prog(frame, 26 + i * 4, 8)} w={6} color={SK.yellow} />
            ))}
          </svg>
          <div style={{ position: "absolute", left: 20, top: 20, width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DrawIcon name={scene.icon ?? "layers"} size={150} start={12} dur={24} stroke={1.5} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Diagram ---------- */
export const SkDiagramScene: React.FC<SceneBodyProps> = ({ scene, frames }) => {
  const frame = useCurrentFrame();
  const { nodes, areaW, areaH, cardW, cardH, pos } = diagramLayout(scene);
  const edges = scene.edges ?? nodes.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  const idx = (ref: string | number) => (typeof ref === "number" ? ref : nodes.findIndex((n) => n.id === ref || n.label === ref));
  const nodeStart = (i: number) => revealFrame(i, nodes.length, frames, 0.08, 0.6);
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 56 }}>
      <SketchTitle title={scene.title} icon={scene.icon ?? "workflow"} />
      <div style={{ position: "relative", marginTop: 26, width: areaW, height: areaH }}>
        <svg width={areaW} height={areaH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {edges.map((e, k) => {
            const a = idx(e[0]);
            const b = idx(e[1]);
            if (a < 0 || b < 0) return null;
            const dx = pos[b].x - pos[a].x;
            const dy = pos[b].y - pos[a].y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const pad = (Math.abs(ux) > Math.abs(uy) ? cardW / 2 : cardH / 2) + 12;
            const x1 = pos[a].x + ux * pad;
            const y1 = pos[a].y + uy * pad;
            const x2 = pos[b].x - ux * pad;
            const y2 = pos[b].y - uy * pad;
            const L = len - 2 * pad;
            const p = prog(frame, Math.max(nodeStart(a), nodeStart(b)) - 6, 18);
            if (L < 20) return null;
            return L < 80 ? (
              <InkArrow key={k} x1={x1} y1={y1} x2={x2} y2={y2} p={p} seed={`e${scene.id}${k}`} />
            ) : (
              <FatArrow key={k} x1={x1} y1={y1} x2={x2} y2={y2} p={p} seed={`e${scene.id}${k}`} thick={L > 150 ? 14 : 10} />
            );
          })}
        </svg>
        {edges.map((e, k) => {
          const label = e[2];
          const a = idx(e[0]);
          const b = idx(e[1]);
          if (!label || a < 0 || b < 0) return null;
          const len = Math.hypot(pos[b].x - pos[a].x, pos[b].y - pos[a].y);
          if (len < label.length * 11 + 2 * cardW / 2 + 60) return null;
          const mx = (pos[a].x + pos[b].x) / 2;
          const my = (pos[a].y + pos[b].y) / 2;
          return (
            <div key={`l${k}`} style={{ position: "absolute", left: mx - 120, top: my - 50, width: 240, textAlign: "center" }}>
              <HandText text={label} size={22} color={SK.note} start={Math.max(nodeStart(a), nodeStart(b)) + 10} seed={`el${k}`} />
            </div>
          );
        })}
        {nodes.map((n, i) => (
          <div key={i} style={{ position: "absolute", left: pos[i].x - cardW / 2, top: pos[i].y - cardH / 2 }}>
            <SketchBox w={cardW} h={cardH} seed={`n${scene.id}${i}`} p={prog(frame, nodeStart(i), 14)}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, padding: "0 8px" }}>
                <DrawIcon name={n.icon ?? "box"} size={42} start={nodeStart(i) + 4} />
                <div style={{ textAlign: "center" }}>
                  <HandText text={n.label} size={24} bold start={nodeStart(i) + 8} seed={`nl${scene.id}${i}`} />
                </div>
              </div>
            </SketchBox>
          </div>
        ))}
      </div>
      {scene.caption ? (
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <HandText text={scene.caption} size={28} color={SK.note} start={Math.round(frames * 0.75)} seed="cap" />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- Compare ---------- */
export const SkCompareScene: React.FC<SceneBodyProps> = ({ scene, frames }) => {
  const frame = useCurrentFrame();
  const sides = [scene.left, scene.right];
  const W = 495;
  const H = 400;
  const vsStart = Math.round(frames * 0.3);
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 56 }}>
      <SketchTitle title={scene.title} icon={scene.icon ?? "git-compare"} />
      <div style={{ position: "relative", marginTop: 26, height: H + 12 }}>
        {sides.map((s, si) => {
          if (!s) return null;
          const st = si === 0 ? 6 : vsStart;
          return (
            <div key={si} style={{ position: "absolute", top: 0, [si === 0 ? "left" : "right"]: 0 }}>
              <SketchBox w={W} h={H} seed={`cmp${scene.id}${si}`} p={prog(frame, st, 16)}>
                <div style={{ padding: "22px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <DrawIcon name={s.icon ?? (si ? "zap" : "box")} size={48} start={st + 6} />
                    <div>
                      <HandText text={s.title} size={36} bold start={st + 10} seed={`ct${scene.id}${si}`} />
                      <Swash w={Math.min(estWidth(s.title, 36), 330)} p={prog(frame, st + 10 + s.title.length, 12)} seed={`cs${si}`} weight={7} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}>
                    {s.items.map((it, i) => {
                      const is = revealFrame(i, s.items.length, frames, si === 0 ? 0.12 : 0.36, 0.2);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <DrawIcon name={bulletIcon(it, "check")} size={34} start={is} dur={12} />
                          <HandText text={bulletText(it)} size={30} start={is + 4} seed={`ci${scene.id}${si}${i}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SketchBox>
            </div>
          );
        })}
        <svg width={120} height={120} style={{ position: "absolute", left: "50%", top: H / 2 - 60, marginLeft: -60, overflow: "visible" }}>
          <g transform="translate(24 24)">
            <Pen make={(s, a) => roughEllipse(36, 36, s, a)} seed={`vs${scene.id}`} p={easeOut(prog(frame, vsStart, 14))} w={3.5} amp={1.6} color={SK.yellowSolid} />
          </g>
        </svg>
        <div style={{ position: "absolute", left: "50%", top: H / 2 - 22, marginLeft: -26, width: 52, textAlign: "center" }}>
          <HandText text="vs" size={40} bold color={SK.yellowSolid} start={vsStart + 8} seed="vs" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Stats ---------- */
export const SkStatsScene: React.FC<SceneBodyProps> = ({ scene, frames }) => {
  const frame = useCurrentFrame();
  const stats = scene.stats ?? [];
  const cw = Math.min(330, (1100 - (stats.length - 1) * 40) / Math.max(1, stats.length));
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 56 }}>
      <SketchTitle title={scene.title} icon={scene.icon ?? "bar-chart-3"} />
      <div style={{ display: "flex", gap: 40, flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 10 }}>
        {stats.map((s, i) => {
          const start = revealFrame(i, stats.length, frames, 0.1, 0.4);
          const m = s.value.match(/^([^\d-]*)(-?[\d,.]+)(.*)$/);
          let shown = s.value;
          if (m) {
            const target = parseFloat(m[2].replace(/,/g, ""));
            const dec = (m[2].split(".")[1] ?? "").length;
            const v = interpolate(frame, [start + 8, start + 44], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            shown = `${m[1]}${v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })}${m[3]}`;
          }
          const bigW = Math.min(cw - 30, Math.max(80, estWidth(s.value, 84, 0.52)));
          return (
            <SketchBox key={i} w={cw} h={330} seed={`st${scene.id}${i}`} p={prog(frame, start, 16)}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, padding: "0 14px", textAlign: "center" }}>
                <DrawIcon name={s.icon ?? "trending-up"} size={64} start={start + 6} />
                <div style={{ position: "relative", marginTop: 6 }}>
                  <svg width={bigW + 40} height={110} style={{ position: "absolute", left: -20, top: -12, overflow: "visible" }}>
                    <Pen make={(sd, a) => roughEllipse((bigW + 40) / 2, 55, sd, a)} seed={`lp${scene.id}${i}`} p={easeOut(prog(frame, start + 46, 16))} w={5} amp={2} color={SK.yellow} />
                  </svg>
                  <HandText text={shown} size={84} bold color={SK.yellowSolid} start={start + 8} cps={60} seed={`sv${i}`} />
                </div>
                <HandText text={s.label} size={28} start={start + 12} seed={`sl${scene.id}${i}`} />
              </div>
            </SketchBox>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Hand-drawn SVG (draw-on, board palette) ---------- */
const DRAWABLE = "path,line,polyline,polygon,circle,ellipse,rect";
export const SkSvgScene: React.FC<SceneBodyProps> = ({ scene, frames }) => {
  const frame = useCurrentFrame();
  const doc = useMemo(() => new DOMParser().parseFromString(scene.svg ?? "<svg/>", "image/svg+xml").documentElement, [scene.svg]);
  const markup = useMemo(() => {
    const root = doc.cloneNode(true) as SVGSVGElement;
    const els = Array.from(root.querySelectorAll(DRAWABLE));
    const drawEnd = frames * 0.62;
    const per = drawEnd / Math.max(1, els.length);
    els.forEach((el, i) => {
      const start = 8 + i * per * 0.6;
      const dur = Math.max(14, per * 1.6);
      const t = clamp01((frame - start) / dur);
      const hasFill = (el.getAttribute("fill") ?? "none") !== "none";
      el.setAttribute("pathLength", "1");
      el.setAttribute("stroke-dasharray", "1 1");
      el.setAttribute("stroke-dashoffset", String(1 - t));
      if (t <= 0) el.setAttribute("stroke-opacity", "0");
      el.setAttribute("stroke", i % 6 === 5 ? SK.yellowSolid : SK.ink);
      if (!el.getAttribute("stroke-width")) el.setAttribute("stroke-width", "3");
      el.setAttribute("stroke-linecap", "round");
      el.setAttribute("stroke-linejoin", "round");
      if (hasFill) {
        el.setAttribute("fill", i % 6 === 5 ? SK.yellow : SK.g2);
        el.setAttribute("fill-opacity", String(clamp01((t - 0.6) / 0.4)));
      }
    });
    root.setAttribute("width", "100%");
    root.setAttribute("height", "100%");
    root.querySelectorAll("text").forEach((el, i) => {
      el.setAttribute("opacity", String(clamp01((frame - frames * 0.35 - i * 6) / 6)));
      el.setAttribute("fill", SK.ink);
      el.setAttribute("font-family", "SkPatrick, 'Patrick Hand', cursive");
    });
    return new XMLSerializer().serializeToString(root);
  }, [doc, frame, frames]);
  const items = scene.bullets ?? [];
  const W = items.length ? 640 : 1000;
  return (
    <AbsoluteFill style={{ padding: PAD, paddingTop: 56 }}>
      <SketchTitle title={scene.title} icon={scene.icon ?? "pen-tool"} />
      <div style={{ display: "flex", gap: 40, flex: 1, alignItems: "center", paddingBottom: 14 }}>
        <SketchBox w={W} h={400} seed={`svg${scene.id}`} p={prog(frame, 2, 16)}>
          <div style={{ position: "absolute", inset: 18 }} dangerouslySetInnerHTML={{ __html: markup }} />
        </SketchBox>
        {items.length ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            {items.map((b, i) => {
              const st = revealFrame(i, items.length, frames, 0.3, 0.4);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <DrawIcon name={bulletIcon(b, "arrow-right")} size={46} start={st} />
                  <HandText text={bulletText(b)} size={32} start={st + 6} seed={`sb${scene.id}${i}`} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
