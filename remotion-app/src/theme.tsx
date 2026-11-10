import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { icons } from "lucide-react";
import aliases from "./icon_aliases.json";

export const PALETTES: [string, string][] = [
  ["#22d3ee", "#6366f1"],
  ["#a78bfa", "#ec4899"],
  ["#34d399", "#22d3ee"],
  ["#f59e0b", "#ef4444"],
];
export const palette = (i: number, custom?: [string, string][]) => {
  const list = custom && custom.length ? custom : PALETTES;
  return list[i % list.length];
};
export const MONO = '"DejaVu Sans Mono", "Fira Code", Menlo, Consolas, monospace';
export const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';

const pascal = (s: string) =>
  s
    .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toUpperCase());

export const Icon: React.FC<{ name?: string; size?: number; color?: string; stroke?: number }> = ({
  name,
  size = 48,
  color = "currentColor",
  stroke = 2,
}) => {
  if (name && /[^\x00-\x7F]/.test(name)) {
    return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{name}</span>; // emoji
  }
  const table = icons as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;
  const key = name ? (aliases as Record<string, string>)[name] ?? name : "";
  const Cmp = (key && table[pascal(key)]) || table.Sparkles;
  return <Cmp size={size} color={color} strokeWidth={stroke} />;
};

/** 0 -> 1 spring starting at `startFrame`. */
export const useIn = (startFrame: number, damping = 18) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - startFrame, fps, config: { damping, stiffness: 120 } });
};

/** Frame at which item i of n should appear, spread over the scene so reveals follow the narration. */
export const revealFrame = (i: number, n: number, durationFrames: number, from = 0.1, span = 0.62) =>
  Math.round(durationFrames * (from + span * (n <= 1 ? 0 : i / n)));

export const IconBadge: React.FC<{
  name?: string;
  size?: number;
  accent: [string, string];
  progress?: number;
}> = ({ name, size = 72, accent, progress = 1 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: `linear-gradient(135deg, ${accent[0]}33, ${accent[1]}33)`,
      border: `2px solid ${accent[0]}88`,
      boxShadow: `0 0 ${size * 0.5}px ${accent[0]}44`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `scale(${progress})`,
      opacity: progress,
      flexShrink: 0,
    }}
  >
    <Icon name={name} size={size * 0.55} color={accent[0]} />
  </div>
);

export const Background: React.FC<{ accent: [string, string] }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const orbs = [
    { x: 0.15, y: 0.2, r: 520, c: accent[0], s: 0.011 },
    { x: 0.85, y: 0.8, r: 620, c: accent[1], s: 0.008 },
    { x: 0.6, y: 0.1, r: 380, c: accent[1], s: 0.014 },
  ];
  return (
    <AbsoluteFill style={{ background: "var(--bg)", overflow: "hidden" }}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: o.x * width + Math.sin(frame * o.s + i) * 90 - o.r / 2,
            top: o.y * height + Math.cos(frame * o.s * 1.3 + i) * 70 - o.r / 2,
            width: o.r,
            height: o.r,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.c}38 0%, transparent 68%)`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          backgroundPosition: `${(frame * 0.4) % 64}px ${(frame * 0.25) % 64}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
        }}
      />
      {Array.from({ length: 22 }).map((_, i) => {
        const x = random(`px${i}`) * width;
        const speed = 0.25 + random(`ps${i}`) * 0.6;
        const y = (((random(`py${i}`) * height - frame * speed) % height) + height) % height;
        const size = 2 + random(`pz${i}`) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 2 ? accent[0] : accent[1],
              opacity: 0.25 + 0.3 * Math.sin(frame * 0.05 + i),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const SceneTitle: React.FC<{
  title: string;
  icon?: string;
  accent: [string, string];
  size?: number;
}> = ({ title, icon, accent, size = 54 }) => {
  const p = useIn(2);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
      }}
    >
      {icon ? <IconBadge name={icon} size={size * 1.35} accent={accent} progress={p} /> : null}
      <h1
        style={{
          fontSize: size,
          margin: 0,
          fontWeight: 800,
          letterSpacing: -1,
          background: `linear-gradient(90deg, var(--text), ${accent[0]})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {title}
      </h1>
    </div>
  );
};

export const bulletText = (b: string | { text: string; icon?: string }) => (typeof b === "string" ? b : b.text);
export const bulletIcon = (b: string | { text: string; icon?: string }, fallback: string) =>
  typeof b === "string" ? fallback : b.icon ?? fallback;
