/**
 * Sketchnote style primitives (opt-in via theme.style = "sketchnote").
 * Ideas adapted from the sketchnote grammar: dot-grid board, double-pass wobbly pen lines (static: no per-frame boil, it flickers),
 * hand lettering written letter by letter, grey marker for shadow/volume, ONE yellow for structure
 * (banners, arrows, number chips), everything drawn on instead of fading in.
 * Our board is BLACK, so ink is chalk-white and the grey marker is translucent white.
 */
import React, { useId, useMemo } from "react";
import { AbsoluteFill, continueRender, delayRender, random, staticFile, useCurrentFrame } from "remotion";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "./theme";

/* ---------- palette ---------- */
export const SK = {
  bg: "#0c0c0e",
  dot: "rgba(255,255,255,0.14)",
  ink: "#F3F1EA", // chalk-white fineliner
  note: "#A8A49A", // secondary notes
  g1: "rgba(255,255,255,0.07)", // grey marker: light volume
  g2: "rgba(255,255,255,0.14)", // shadows
  g3: "rgba(255,255,255,0.24)", // folds, dark parts
  yellow: "rgba(255,205,40,0.88)",
  yellowSolid: "#FFCD28",
  yellowDark: "#F5AA00",
  onYellow: "#141416",
} as const;
export const HAND_BOLD = '"SkKalam", "Kalam", "Comic Sans MS", cursive';
export const HAND = '"SkPatrick", "Patrick Hand", "Comic Sans MS", cursive';
export const SK_ACCENT: [string, string] = [SK.yellowSolid, SK.yellowDark];

/* ---------- fonts (self-hosted, OFL) ---------- */
if (typeof document !== "undefined" && typeof FontFace !== "undefined") {
  const handle = delayRender("sketch fonts");
  Promise.all([
    new FontFace("SkKalam", `url(${staticFile("fonts/Kalam-Bold.ttf")})`, { weight: "700" }).load(),
    new FontFace("SkPatrick", `url(${staticFile("fonts/PatrickHand-Regular.ttf")})`).load(),
  ])
    .then((faces) => faces.forEach((f) => document.fonts.add(f)))
    .catch(() => undefined)
    .finally(() => continueRender(handle));
}

/* ---------- small helpers ---------- */
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const prog = (frame: number, start: number, dur: number) => clamp01((frame - start) / dur);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const estWidth = (text: string, size: number, k = 0.52) => text.length * size * k;

type Pt = { x: number; y: number };

const rrPoints = (w: number, h: number, r: number, step = 6): Pt[] => {
  r = Math.min(r, w / 2, h / 2);
  const pts: Pt[] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) pts.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n });
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.round((r * Math.abs(a1 - a0)) / step));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  };
  line(r, 0, w - r, 0);
  arc(w - r, r, -Math.PI / 2, 0);
  line(w, r, w, h - r);
  arc(w - r, h - r, 0, Math.PI / 2);
  line(w - r, h, r, h);
  arc(r, h - r, Math.PI / 2, Math.PI);
  line(0, h - r, 0, r);
  arc(r, r, Math.PI, Math.PI * 1.5);
  return pts;
};

const ellipsePoints = (rx: number, ry: number, step = 6): Pt[] => {
  const n = Math.max(16, Math.round((Math.PI * (rx + ry)) / step));
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: rx + rx * Math.cos(a), y: ry + ry * Math.sin(a) };
  });
};

const linePoints = (x0: number, y0: number, x1: number, y1: number, step = 6): Pt[] => {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
};

/** Layered sines along the normal: slow wobble + medium + fine tremor. Closed shapes start anywhere and overshoot a little. */
const wobblePath = (pts: Pt[], seed: string, amp: number, closed: boolean): string => {
  const n = pts.length;
  const f1 = random(seed + "a") * 6.28;
  const f2 = random(seed + "b") * 6.28;
  const f3 = random(seed + "c") * 6.28;
  const start = closed ? Math.floor(random(seed + "s") * n) : 0;
  const total = closed ? n + 4 : n; // overshoot
  let s = 0;
  const out: string[] = [];
  for (let k = 0; k < total; k++) {
    const i = (start + k) % n;
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const dx = closed || (i > 0 && i < n - 1) ? b.x - a.x : i === 0 ? pts[1].x - pts[0].x : pts[n - 1].x - pts[n - 2].x;
    const dy = closed || (i > 0 && i < n - 1) ? b.y - a.y : i === 0 ? pts[1].y - pts[0].y : pts[n - 1].y - pts[n - 2].y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    if (k > 0) s += Math.hypot(pts[i].x - pts[(i - 1 + n) % n].x, pts[i].y - pts[(i - 1 + n) % n].y);
    const d = amp * (0.55 * Math.sin(s * 0.018 + f1) + 0.3 * Math.sin(s * 0.047 + f2) + 0.15 * Math.sin(s * 0.13 + f3));
    out.push(`${k === 0 ? "M" : "L"}${(pts[i].x + nx * d).toFixed(1)} ${(pts[i].y + ny * d).toFixed(1)}`);
  }
  return out.join(" ");
};

export const roughRect = (w: number, h: number, r: number, seed: string, amp = 1.8) => wobblePath(rrPoints(w, h, r), seed, amp, true);
export const roughEllipse = (rx: number, ry: number, seed: string, amp = 1.8) => wobblePath(ellipsePoints(rx, ry), seed, amp, true);
export const roughLine = (x0: number, y0: number, x1: number, y1: number, seed: string, amp = 1.4) =>
  wobblePath(linePoints(x0, y0, x1, y1), seed, amp, false);

/* ---------- board ---------- */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export const SketchBoard: React.FC = () => (
  <AbsoluteFill style={{ background: "var(--bg)", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(circle, ${SK.dot} 1.3px, transparent 1.7px)`,
        backgroundSize: "26px 26px",
        backgroundPosition: "13px 13px",
      }}
    />
    <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, opacity: 0.05, mixBlendMode: "screen" }} />
  </AbsoluteFill>
);

/* ---------- pen strokes ---------- */
/** One path drawn on with the pen (progress p 0..1). */
export const Stroke: React.FC<{ d: string; p: number; w?: number; color?: string; alpha?: number; fill?: string }> = ({
  d, p, w = 3, color = SK.ink, alpha = 1, fill = "none",
}) =>
  p <= 0 ? null : (
    <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill={fill} stroke={color} strokeOpacity={alpha}
      strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  );

/** Double pass fineliner: second pass thinner, lighter, wobblier, a beat later. */
export const Pen: React.FC<{ make: (seed: string, amp: number) => string; seed: string; p: number; w?: number; color?: string; amp?: number }> = ({
  make, seed, p, w = 3, color = SK.ink, amp = 1.8,
}) => (
  <>
    <Stroke d={make(seed + "1", amp)} p={p} w={w} color={color} />
    <Stroke d={make(seed + "2", amp * 1.5)} p={clamp01((p - 0.08) / 0.92)} w={w * 0.6} color={color} alpha={0.5} />
  </>
);

/** Grey-marker region revealed left to right like a marker laid in one sweep. */
const MarkerSweep: React.FC<{ id: string; w: number; h: number; p: number; children: React.ReactNode }> = ({ id, w, h, p, children }) =>
  p <= 0 ? null : (
    <>
      <clipPath id={id}>
        <rect x={-30} y={-30} width={(w + 60) * p} height={h + 60} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  );

/** Rough rounded box with paper fill, drop shadow (down-right) and children laid on top. */
export const SketchBox: React.FC<{
  w: number; h: number; r?: number; seed: string; p: number; shadow?: boolean; fill?: string; ink?: string;
  style?: React.CSSProperties; children?: React.ReactNode;
}> = ({ w, h, r = 18, seed, p, shadow = true, fill, ink = SK.ink, style, children }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sh = 9;
  const rrFill = useMemo(() => roughRect(w, h, r, seed + "f", 0.8), [w, h, r, seed]);
  return (
    <div style={{ position: "relative", width: w, height: h, ...style }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {shadow ? (
          <MarkerSweep id={`sw${uid}`} w={w + sh} h={h + sh} p={clamp01((p - 0.5) / 0.5)}>
            <g transform={`translate(${sh} ${sh})`}>
              <path d={rrFill} fill={SK.g2} />
            </g>
          </MarkerSweep>
        ) : null}
        {p > 0.02 ? <path d={rrFill} fill={fill ?? "var(--bg)"} /> : null}
        <Pen make={(s, a) => roughRect(w, h, r, s, a)} seed={seed} p={easeOut(clamp01(p / 0.75))} color={ink} />
      </svg>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
};

/* ---------- hand lettering ---------- */
/** Text written letter by letter with a little tilt and bob per letter (fixed seed). */
export const HandText: React.FC<{
  text: string; size: number; start: number; bold?: boolean; color?: string; cps?: number; seed?: string;
  style?: React.CSSProperties;
}> = ({ text, size, start, bold = false, color = SK.ink, cps = 24, seed = "t", style }) => {
  const frame = useCurrentFrame();
  const fpc = 24 / cps;
  const words = text.split(" ");
  let idx = 0;
  return (
    <span style={{ fontFamily: bold ? HAND_BOLD : HAND, fontWeight: bold ? 700 : 400, fontSize: size, lineHeight: 1.15, color, ...style }}>
      {words.map((word, wi) => {
        const chars = Array.from(word).map((ch, ci) => {
          const my = idx++;
          const on = frame >= start + my * fpc;
          const rot = (random(`${seed}r${my}`) - 0.5) * 3.2;
          const bob = (random(`${seed}b${my}`) - 0.5) * 3;
          return (
            <span key={ci} style={{ display: "inline-block", opacity: on ? 1 : 0, transform: `translateY(${bob}px) rotate(${rot}deg)` }}>
              {ch}
            </span>
          );
        });
        idx++; // the space
        return (
          <React.Fragment key={wi}>
            <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>{chars}</span>
            {wi < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </span>
  );
};

/** Yellow marker swash (underline) that draws on. */
export const Swash: React.FC<{ w: number; p: number; seed?: string; weight?: number }> = ({ w, p, seed = "sw", weight = 9 }) => {
  const d = useMemo(() => {
    const k = random(seed) * 3;
    const n = Math.max(2, Math.round(w / 70));
    let path = `M2 ${8 + k}`;
    for (let i = 1; i <= n; i++) path += ` Q ${((i - 0.5) * w) / n} ${i % 2 ? 1 : 13}, ${(i * w) / n - 2} ${7 + (i % 2) * 2}`;
    return path;
  }, [w, seed]);
  return (
    <svg width={w} height={18} style={{ display: "block", overflow: "visible" }}>
      <Stroke d={d} p={p} w={weight} color={SK.yellow} />
    </svg>
  );
};

/* ---------- icons drawn on with the pen ---------- */
const DRAWABLE = "path,line,polyline,polygon,circle,ellipse,rect";
export const DrawIcon: React.FC<{ name?: string; size?: number; color?: string; start?: number; dur?: number; stroke?: number }> = ({
  name, size = 48, color = SK.ink, start = 0, dur = 16, stroke = 2,
}) => {
  const frame = useCurrentFrame();
  const base = useMemo(() => {
    if (name && /[^\x00-\x7F]/.test(name)) return null;
    return renderToStaticMarkup(<Icon name={name} size={size} color={color} stroke={stroke} />);
  }, [name, size, color, stroke]);
  if (base === null) return <Icon name={name} size={size} color={color} />;
  const p = prog(frame, start, dur);
  if (p <= 0) return <span style={{ display: "inline-block", width: size, height: size }} />;
  const doc = new DOMParser().parseFromString(base, "image/svg+xml").documentElement;
  const els = Array.from(doc.querySelectorAll(DRAWABLE));
  const cnt = els.length;
  const d = cnt <= 1 ? 1 : Math.max(0.3, Math.min(1, 1.6 / cnt)); // each part's share of the draw time
  els.forEach((el, i) => {
    const t = clamp01((p - (cnt <= 1 ? 0 : (i * (1 - d)) / (cnt - 1))) / d);
    el.setAttribute("pathLength", "1");
    el.setAttribute("stroke-dasharray", "1 1");
    el.setAttribute("stroke-dashoffset", String(1 - t));
    if (t <= 0) el.setAttribute("stroke-opacity", "0");
  });
  return <span style={{ display: "inline-block", width: size, height: size, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: new XMLSerializer().serializeToString(doc) }} />;
};

/* ---------- fat yellow arrow ---------- */
export const FatArrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; seed: string; thick?: number }> = ({
  x1, y1, x2, y2, p, seed, thick = 14,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const L = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const head = Math.min(34, L * 0.45);
  const hw = thick * 1.7;
  const j = (k: string) => (random(seed + k) - 0.5) * 2.2;
  const pts: Pt[] = [
    { x: 0, y: -thick / 2 }, { x: L - head, y: -thick / 2 + j("a") }, { x: L - head, y: -hw }, { x: L, y: 0 },
    { x: L - head, y: hw }, { x: L - head, y: thick / 2 + j("b") }, { x: 0, y: thick / 2 },
  ];
  const d = "M" + pts.map((q) => `${q.x.toFixed(1)} ${(q.y + j(String(q.x))).toFixed(1)}`).join(" L") + " Z";
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${ang})`}>
      <MarkerSweep id={`fa${uid}`} w={L} h={hw * 2} p={clamp01((p - 0.35) / 0.65)}>
        <path d={d} fill={SK.yellow} />
      </MarkerSweep>
      <Stroke d={d} p={easeOut(clamp01(p / 0.7))} w={2.4} color={SK.ink} />
    </g>
  );
};

/** Thin ink arrow for short hops. */
export const InkArrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; seed: string }> = ({ x1, y1, x2, y2, p, seed }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 16;
  const hx = (t: number) => `M${x2} ${y2} L${x2 - h * Math.cos(a + t)} ${y2 - h * Math.sin(a + t)}`;
  return (
    <g>
      <Pen make={(s, amp) => roughLine(x1, y1, x2, y2, s, amp)} seed={seed} p={easeOut(p)} w={3} amp={1.2} />
      <Stroke d={hx(0.45)} p={clamp01((p - 0.7) / 0.3)} w={3} />
      <Stroke d={hx(-0.45)} p={clamp01((p - 0.75) / 0.25)} w={3} />
    </g>
  );
};

/* ---------- title banner for content scenes ---------- */
export const SketchTitle: React.FC<{ title: string; icon?: string; size?: number }> = ({ title, icon, size = 52 }) => {
  const frame = useCurrentFrame();
  const m = title.match(/^(Q\d+(?:\.\d+)?)\s+(.*)$/);
  const chip = m ? m[1] : null;
  const text = m ? m[2] : title;
  const chipW = chip ? estWidth(chip, 34, 0.55) + 40 : 0;
  const textW = estWidth(text, size);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, minHeight: 90 }}>
      {chip ? (
        <div style={{ position: "relative", width: chipW, height: 58, flexShrink: 0 }}>
          <svg width={chipW} height={58} style={{ position: "absolute", overflow: "visible" }}>
            <MarkerSweepBox w={chipW} h={58} p={prog(frame, 2, 10)} />
            <Pen make={(s, a) => roughRect(chipW, 58, 12, s, a)} seed={`chip${title}`} p={prog(frame, 0, 12)} w={3} amp={1.4} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <HandText text={chip} size={34} bold color={SK.onYellow} start={8} seed={`chipt${title}`} />
          </div>
        </div>
      ) : null}
      {icon ? <DrawIcon name={icon} size={size * 1.05} start={6} /> : null}
      <div>
        <HandText text={text} size={size} bold start={10} seed={`ttl${title}`} />
        <Swash w={Math.min(textW, 900)} p={prog(frame, 10 + text.length, 14)} seed={`sw${title}`} />
      </div>
    </div>
  );
};

const MarkerSweepBox: React.FC<{ w: number; h: number; p: number }> = ({ w, h, p }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <MarkerSweep id={`mb${uid}`} w={w} h={h} p={p}>
      <path d={roughRect(w, h, 12, `chipfill${w}`, 0.8)} fill={SK.yellow} />
    </MarkerSweep>
  );
};
