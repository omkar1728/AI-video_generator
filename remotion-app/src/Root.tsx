import React from "react";
import { Composition } from "remotion";
import { SceneVideo, sceneFrames } from "./SceneVideo";
import type { SceneProps } from "./types";

const FPS = 30;

// Studio preview default. The pipeline overrides it with --props.
const sample: SceneProps = {
  index: 0,
  total: 1,
  captions: false,
  scene: {
    id: "sample",
    type: "bullets",
    title: "Studio preview",
    icon: "rocket",
    bullets: [{ text: "Edit props in the sidebar", icon: "pencil" }, { text: "Or run the pipeline", icon: "play" }],
    narration: "Sample scene.",
    audio: "",
    duration: 6,
  },
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Scene"
    component={SceneVideo}
    width={1280}
    height={720}
    fps={FPS}
    durationInFrames={sceneFrames(6, FPS)}
    defaultProps={sample}
    calculateMetadata={({ props }) => ({
      durationInFrames: sceneFrames(props.scene.duration, FPS),
    })}
  />
);
