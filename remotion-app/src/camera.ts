/**
 * Camera moves for the sketchnote style (one smooth world->screen transform per scene).
 * Grammar used: slow push while things are written, ride along as items are drawn, pan between blocks,
 * pull back to the whole page at the end. No cuts, no pen scratch, no sound.
 * Zoom is always about a focus point, so zoom 1 is the identity whatever the focus is and the board never shows an edge.
 */
import type { Scene } from "./types";
import { revealFrame } from "./theme";

export type Cam = { z: number; x: number; y: number }; // zoom about focus point (x, y) in 1280x720 frame coordinates
type Key = Cam & { f: number };

const W = 1280;
const H = 720;
export const CONTENT_SCALE = 0.86; // keep in sync with SceneVideo when captions are on
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic in-out
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const K = (f: number, z: number, x: number, y: number): Key => ({ f, z, x, y });

export const camAt = (keys: Key[], frame: number): Cam => {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.f) {
      const t = ease(clamp01((frame - a.f) / Math.max(1, b.f - a.f)));
      return { z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)), x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
  }
  return keys[keys.length - 1];
};

/** CSS transform for a camera state (apply with transform-origin 0 0 on a full-frame wrapper). */
export const camTransform = (c: Cam) => `translate(${(c.x * (1 - c.z)).toFixed(2)}px, ${(c.y * (1 - c.z)).toFixed(2)}px) scale(${c.z.toFixed(4)})`;

/* ---------- shared layout geometry (content coordinates, 1280x720) ---------- */
const PAD = 90;
const TITLE_BOTTOM = 56 + 90; // top padding + title row

export const diagramLayout = (scene: Scene) => {
  const nodes = (scene.nodes ?? []).map((n, i) => ({ ...n, col: n.col ?? i, row: n.row ?? 0 }));
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;
  const areaW = W - PAD * 2;
  const areaH = H - 310;
  const cardW = Math.min(200, areaW / cols - 40);
  const cardH = 120;
  const pos = nodes.map((n) => ({
    x: cols === 1 ? areaW / 2 : cardW / 2 + 10 + (n.col * (areaW - cardW - 20)) / (cols - 1),
    y: rows === 1 ? areaH / 2 : cardH / 2 + (n.row * (areaH - cardH)) / (rows - 1),
  }));
  return { nodes, cols, rows, areaW, areaH, cardW, cardH, pos, areaTop: TITLE_BOTTOM + 26 };
};

/** Camera keyframes for one scene. `frames` = scene length in frames. */
export const cameraFor = (scene: Scene, frames: number, captions: boolean): ((frame: number) => Cam) => {
  // content coordinates -> frame coordinates (content is scaled down from the top when subtitles are on)
  const m = (x: number, y: number): [number, number] => (captions ? [W / 2 + (x - W / 2) * CONTENT_SCALE, y * CONTENT_SCALE] : [x, y]);
  const home = m(W / 2, H / 2);
  const end = Math.round(frames * 0.9);
  const settle = (z: number, x: number, y: number): Key[] => [K(end - Math.round(frames * 0.1), z, x, y), K(end, 1, home[0], home[1])];
  let keys: Key[];

  switch (scene.type) {
    case "title":
    case "outro": {
      // pull back from the icon to the whole page
      const [x, y] = m(W / 2, 190);
      keys = [K(0, 1.16, x, y), K(Math.round(frames * 0.5), 1, home[0], home[1])];
      break;
    }
    case "bullets": {
      const n = (scene.bullets ?? []).length || 1;
      const h = n >= 5 ? 74 : n === 4 ? 86 : 100;
      const gap = n >= 5 ? 16 : 22;
      const z = 1.06;
      keys = [K(0, 1, home[0], home[1])];
      for (let i = 0; i < n; i++) {
        const [x, y] = m(430, TITLE_BOTTOM + 20 + i * (h + gap) + h / 2);
        keys.push(K(revealFrame(i, n, frames), z, x, y));
      }
      keys.push(...settle(z, keys[keys.length - 1].x, keys[keys.length - 1].y));
      break;
    }
    case "diagram": {
      const { nodes, pos, areaTop } = diagramLayout(scene);
      const z = 1.09;
      keys = [K(0, 1, home[0], home[1])];
      nodes.forEach((_, i) => {
        const [x, y] = m(PAD + pos[i].x, areaTop + pos[i].y);
        keys.push(K(revealFrame(i, nodes.length, frames, 0.08, 0.6) + 4, z, x, y));
      });
      keys.push(...settle(z, keys[keys.length - 1].x, keys[keys.length - 1].y));
      break;
    }
    case "compare": {
      const z = 1.08;
      const L = m(337, 372);
      const R = m(943, 372);
      keys = [K(0, 1, home[0], home[1]), K(14, z, L[0], L[1]), K(Math.round(frames * 0.27), z, L[0], L[1]), K(Math.round(frames * 0.4), z, R[0], R[1]), ...settle(z, R[0], R[1])];
      break;
    }
    case "stats": {
      const n = (scene.stats ?? []).length || 1;
      const cw = Math.min(330, (1100 - (n - 1) * 40) / n);
      const total = n * cw + (n - 1) * 40;
      const z = 1.07;
      keys = [K(0, 1, home[0], home[1])];
      for (let i = 0; i < n; i++) {
        const [x, y] = m(W / 2 - total / 2 + cw / 2 + i * (cw + 40), 340);
        keys.push(K(revealFrame(i, n, frames, 0.1, 0.4) + 6, z, x, y));
      }
      keys.push(...settle(z, keys[keys.length - 1].x, keys[keys.length - 1].y));
      break;
    }
    case "svg": {
      const hasItems = (scene.bullets ?? []).length > 0;
      const z = 1.07;
      const box = m(PAD + (hasItems ? 320 : 500), 340);
      keys = [K(0, 1, home[0], home[1]), K(Math.round(frames * 0.12), z, box[0], box[1])];
      if (hasItems) {
        const list = m(PAD + 640 + 40 + 190, 340);
        keys.push(K(Math.round(frames * 0.45), z, box[0], box[1]), K(Math.round(frames * 0.6), z, list[0], list[1]), ...settle(z, list[0], list[1]));
      } else {
        keys.push(...settle(z, box[0], box[1]));
      }
      break;
    }
    default:
      keys = [K(0, 1, home[0], home[1]), K(frames, 1.04, home[0], home[1])];
  }
  keys.sort((a, b) => a.f - b.f);
  return (frame: number) => camAt(keys, frame);
};
