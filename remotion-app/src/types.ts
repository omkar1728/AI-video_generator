export type BulletItem = string | { text: string; icon?: string };

export type DiagramNode = { id?: string; label: string; icon?: string; col?: number; row?: number };
// edge: [from, to] or [from, to, label]; from/to are node ids or indexes
export type DiagramEdge = [string | number, string | number] | [string | number, string | number, string];

export type CompareSide = { title: string; icon?: string; items: BulletItem[] };
export type Stat = { value: string; label: string; icon?: string };

export type SceneType =
  | "title"
  | "bullets"
  | "code"
  | "diagram"
  | "compare"
  | "stats"
  | "image"
  | "svg"
  | "outro";

export type Scene = {
  id: string;
  type: SceneType;
  title: string;
  subtitle?: string;
  icon?: string;
  narration: string;
  bullets?: BulletItem[];
  // code
  code?: string;
  language?: string;
  filename?: string;
  highlight?: number[]; // 1-based lines to spotlight
  caption?: string;
  // diagram
  nodes?: DiagramNode[];
  edges?: DiagramEdge[];
  // compare
  left?: CompareSide;
  right?: CompareSide;
  // stats
  stats?: Stat[];
  // image
  image?: string; // path under public/
  credit?: string;
  // svg
  svg?: string; // raw <svg viewBox=...> markup
  // resolved by build.py
  audio: string;
  duration: number;
};

export type Theme = {
  mode?: "dark" | "light";
  bg?: string; // page background
  text?: string;
  muted?: string;
  palettes?: [string, string][]; // accent gradient pairs, cycled per scene
};

export type SceneProps = {
  theme?: Theme;
  scene: Scene;
  index: number;
  total: number;
  captions: boolean;
};
