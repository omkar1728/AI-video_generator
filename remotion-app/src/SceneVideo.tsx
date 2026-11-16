import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps, Theme } from "./types";
import { Background, SANS, palette } from "./theme";
import { BulletsScene, CodeScene, DiagramScene, TitleScene } from "./scenes1";
import { CompareScene, ImageScene, StatsScene, SvgScene } from "./scenes2";
import { SkBulletsScene, SkCompareScene, SkDiagramScene, SkStatsScene, SkSvgScene, SkTitleScene } from "./scenesSketch";
import { HAND, SK, SK_ACCENT, SketchBoard } from "./sketch";
import { camTransform, cameraFor } from "./camera";

export const PAD_SECONDS = 0.6;
export const sceneFrames = (duration: number, fps: number) => Math.ceil((duration + PAD_SECONDS) * fps);

const CAP_BAND = 0.14; // bottom share of the frame reserved for subtitles
const CONTENT_SCALE = 1 - CAP_BAND;

/** Split narration into movie-style subtitle chunks (<= ~2 lines each). */
const chunkNarration = (text: string, maxChars = 66): string[] => {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?;:]+[.!?;:]?\s*/g) ?? [text];
  const out: string[] = [];
  for (const sent of sentences) {
    let rest = sent.trim();
    while (rest.length > maxChars) {
      // prefer a comma break near the middle, else a space near the middle
      const mid = Math.min(maxChars, Math.floor(rest.length / 2) + 10);
      let cut = rest.lastIndexOf(", ", mid);
      if (cut < 20) cut = rest.lastIndexOf(" ", mid);
      else cut += 1;
      if (cut < 20) cut = rest.indexOf(" ", mid);
      if (cut < 0) break;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
};

const Captions: React.FC<{ text: string; spokenFrames: number; sketch?: boolean }> = ({ text, spokenFrames, sketch }) => {
  const frame = useCurrentFrame();
  const chunks = React.useMemo(() => chunkNarration(text), [text]);
  const weights = chunks.map((c) => c.length + 12); // +pause allowance
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  let current = chunks.length - 1;
  for (let i = 0; i < chunks.length; i++) {
    acc += weights[i];
    if (frame < (acc / total) * spokenFrames) { current = i; break; }
  }
  if (frame > spokenFrames + 10) return null;
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${CAP_BAND * 100}%`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
      {sketch ? (
        <div style={{ position: "relative", background: "#17171a", border: `1.5px solid ${SK.note}88`, padding: "10px 30px", borderRadius: 4, fontFamily: HAND, fontSize: 31, lineHeight: 1.25, color: SK.ink, textAlign: "center", maxWidth: 1040, transform: "rotate(-0.4deg)", boxShadow: "6px 6px 0 rgba(255,255,255,0.10)" }}>
          <div style={{ position: "absolute", left: -22, top: -10, width: 84, height: 24, transform: "rotate(-9deg)", background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.26) 0 8px, rgba(255,255,255,0.18) 8px 16px)" }} />
          {chunks[current]}
        </div>
      ) : (
        <div style={{ background: "rgba(0,0,0,0.72)", padding: "8px 24px", borderRadius: 10, fontSize: 30, lineHeight: 1.25, color: "#fff", textAlign: "center", maxWidth: 1040 }}>
          {chunks[current]}
        </div>
      )}
    </div>
  );
};

const cssVars = (t: Theme = {}): React.CSSProperties => {
  if (t.style === "sketchnote") {
    return {
      "--bg": t.bg ?? SK.bg, "--text": t.text ?? SK.ink, "--muted": t.muted ?? SK.note,
      "--card": "rgba(255,255,255,0.05)", "--panel": "#141416", "--line": "rgba(255,255,255,0.06)",
    } as React.CSSProperties;
  }
  const light = t.mode === "light";
  return {
    "--bg": t.bg ?? (light ? "#f8fafc" : "#070b1a"),
    "--text": t.text ?? (light ? "#0f172a" : "#ffffff"),
    "--muted": t.muted ?? (light ? "#475569" : "#94a3b8"),
    "--card": light ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)",
    "--panel": light ? "#ffffff" : "rgba(15,23,42,0.88)",
    "--line": light ? "rgba(15,23,42,0.07)" : "rgba(255,255,255,0.045)",
  } as React.CSSProperties;
};

export const SceneVideo: React.FC<SceneProps> = ({ scene, index, total, captions, theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const sketch = theme?.style === "sketchnote";
  const accent = sketch ? SK_ACCENT : palette(index, theme?.palettes);
  const fade = Math.min(
    interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" }),
  );
  const body = { scene, accent, frames: durationInFrames };
  const camera = React.useMemo(() => cameraFor(scene, durationInFrames, captions), [scene, durationInFrames, captions]);
  let content: React.ReactNode;
  switch (scene.type) {
    case "title": content = sketch ? <SkTitleScene {...body} /> : <TitleScene {...body} />; break;
    case "outro": content = sketch ? <SkTitleScene {...body} outro /> : <TitleScene {...body} outro />; break;
    case "code": content = <CodeScene {...body} />; break;
    case "diagram": content = sketch ? <SkDiagramScene {...body} /> : <DiagramScene {...body} />; break;
    case "compare": content = sketch ? <SkCompareScene {...body} /> : <CompareScene {...body} />; break;
    case "stats": content = sketch ? <SkStatsScene {...body} /> : <StatsScene {...body} />; break;
    case "image": content = <ImageScene {...body} />; break;
    case "svg": content = sketch ? <SkSvgScene {...body} /> : <SvgScene {...body} />; break;
    default: content = sketch ? <SkBulletsScene {...body} /> : <BulletsScene {...body} />;
  }
  return (
    <AbsoluteFill style={{ fontFamily: sketch ? HAND : SANS, color: "var(--text)", ...cssVars(theme) }}>
      {sketch ? (
        // camera: board and content move together; subtitles and counter stay in screen space
        <AbsoluteFill style={{ transformOrigin: "0 0", transform: camTransform(camera(frame)) }}>
          <SketchBoard />
          <AbsoluteFill style={{ opacity: fade, transform: captions ? `scale(${CONTENT_SCALE})` : undefined, transformOrigin: "50% 0%" }}>{content}</AbsoluteFill>
        </AbsoluteFill>
      ) : (
        <>
          <Background accent={accent} />
          <AbsoluteFill style={{ opacity: fade, transform: captions ? `scale(${CONTENT_SCALE})` : undefined, transformOrigin: "50% 0%" }}>{content}</AbsoluteFill>
        </>
      )}
      {captions ? <Captions text={scene.narration} spokenFrames={Math.round(scene.duration * fps)} sketch={sketch} /> : null}
      <div style={{ position: "absolute", right: 30, top: 22, fontSize: sketch ? 22 : 18, color: "var(--muted)" }}>{index + 1} / {total}</div>
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
    </AbsoluteFill>
  );
};
