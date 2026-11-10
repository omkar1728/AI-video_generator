import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps, Theme } from "./types";
import { Background, SANS, palette } from "./theme";
import { BulletsScene, CodeScene, DiagramScene, TitleScene } from "./scenes1";
import { CompareScene, ImageScene, StatsScene, SvgScene } from "./scenes2";

export const PAD_SECONDS = 0.6;
export const sceneFrames = (duration: number, fps: number) => Math.ceil((duration + PAD_SECONDS) * fps);

const Captions: React.FC<{ text: string; frames: number; accent: [string, string] }> = ({ text, frames, accent }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const spoken = frames - 0.6 * 30;
  const idx = Math.floor((frame / spoken) * words.length);
  const winStart = Math.max(0, Math.min(words.length - 9, idx - 3));
  const win = words.slice(winStart, winStart + 9);
  return (
    <div style={{ position: "absolute", bottom: 26, left: 0, right: 0, textAlign: "center", fontSize: 28 }}>
      <span style={{ background: "rgba(0,0,0,0.6)", padding: "8px 18px", borderRadius: 12 }}>
        {win.map((w, i) => (
          <span key={i} style={{ color: winStart + i <= idx ? accent[0] : "#94a3b8", marginRight: 8 }}>{w}</span>
        ))}
      </span>
    </div>
  );
};

const cssVars = (t: Theme = {}): React.CSSProperties => {
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
  const { durationInFrames } = useVideoConfig();
  const accent = palette(index, theme?.palettes);
  const fade = Math.min(
    interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" }),
  );
  const body = { scene, accent, frames: durationInFrames };
  let content: React.ReactNode;
  switch (scene.type) {
    case "title": content = <TitleScene {...body} />; break;
    case "outro": content = <TitleScene {...body} outro />; break;
    case "code": content = <CodeScene {...body} />; break;
    case "diagram": content = <DiagramScene {...body} />; break;
    case "compare": content = <CompareScene {...body} />; break;
    case "stats": content = <StatsScene {...body} />; break;
    case "image": content = <ImageScene {...body} />; break;
    case "svg": content = <SvgScene {...body} />; break;
    default: content = <BulletsScene {...body} />;
  }
  return (
    <AbsoluteFill style={{ fontFamily: SANS, color: "var(--text)", ...cssVars(theme) }}>
      <Background accent={accent} />
      <AbsoluteFill style={{ opacity: fade }}>{content}</AbsoluteFill>
      {captions ? <Captions text={scene.narration} frames={durationInFrames} accent={accent} /> : null}
      <div style={{ position: "absolute", right: 30, top: 22, fontSize: 18, color: "var(--muted)" }}>{index + 1} / {total}</div>
      {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
    </AbsoluteFill>
  );
};
