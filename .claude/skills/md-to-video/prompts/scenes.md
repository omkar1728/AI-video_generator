# Prompt: script.md -> scenes.json

Convert `script.md` (+ `source.md` for exact code and facts) into `scenes.json`. Output valid JSON only, saved to the job dir.

## Top level
```json
{ "title": "...", "voice": "am_liam", "voices": {"A": "af_heart", "B": "am_michael"}, "captions": true, "pronunciations": {"Term": "spoken form"}, "scenes": [ ... ] }
```
Voices: single narrator = `"voice"` only (default `am_liam`). Multiple voices = `"voices"` map of speaker label to Kokoro voice (female e.g. `af_heart`, `af_bella`, `bf_emma`; male e.g. `am_michael`, `am_adam`, `bm_george`) and per scene either `"speaker": "A"` (whole narration) or `"narration": [{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]` for dialogue within a scene. Use multiple voices only when the user asks (e.g. "two hosts"); for hosts, A leads and B reacts or adds the detail, and avoid more than 3 lines per scene. Captions are ON by default (set `false` only if asked). Output is 1080p by default.

## Theme (optional; omit for the default dark technical look)
`"theme": {"mode": "dark"|"light", "bg": "#hex", "text": "#hex", "muted": "#hex", "palettes": [["#accentA","#accentB"], ...]}`
Palettes (2 to 4 pairs) cycle per scene. Special look: `"theme": {"style": "sketchnote"}` = black dot-grid board, hand lettering, drawn-on strokes, one yellow accent (palettes are ignored). Keep node labels and bullets short (<= 4 words) so hand lettering fits; compare items <= 28 characters. The look includes automatic camera moves (pull-back on title/outro, follows items as they are drawn, left-to-right pan on compares) and has NO per-frame flicker; nothing to configure. Keep strong contrast between bg and text. Examples: light clean = `{"mode":"light","palettes":[["#0ea5e9","#6366f1"],["#db2777","#f97316"]]}`; warm = dark with `bg "#1a0f0a"` and orange/amber pairs. Only set fields you need.

## Scene fields
Common: `id` (`s1-hook`, unique, kebab), `type`, `title` (<= 6 words), `icon` (lucide icon name, kebab-case, e.g. `database`, `brain-circuit`, `search`, `file-text`, `server`, `cloud`, `shield-check`, `rocket`, `puzzle`, `layers`, `git-branch`, `zap`, `bot`, `book-open`; an emoji also works), `narration` (verbatim from script; string or dialogue list). Nothing from the source md may be lost: put every fact in narration, and show as many as fit on screen (use multiple scenes for long tables/lists).

| type | extra fields |
|---|---|
| `title` | `subtitle` |
| `bullets` | `bullets`: 3 to 5 items, each `"text"` or `{"text","icon"}`; <= 4 words each; give every item its own icon |
| `code` | `code` (real snippet from the source, <= 12 lines, <= 70 chars per line), `language`, `filename`, `highlight` (1-based line numbers to spotlight after typing), `pointer` (list of `{"line": N, "word": "spoken word"}`: the pointer moves to line N when that word is narrated; one entry per line you explain, in narration order), `caption` (one takeaway line) |
| `diagram` | `nodes`: `[{"id","label"(<=2 words),"icon","col","row"}]` (grid; omit col/row for a left-to-right chain; max 6 columns, 3 rows), `edges`: `[["from","to","optional label"]]` by node id, `caption`. Fan-out example: source at col 0,row 1; three nodes at col 1,rows 0..2; sink at col 2,row 1 |
| `manim` | `manim`: class name in `jobs/<job>/manim_scenes.py` (one class per scene, subclass `BaseScene` from `scripts/manim_base.py`). Use for math, equations, algorithm steps, graphs, data movement. No `svg`/`nodes` needed; the class draws everything. Keep `title` as the on-screen heading (<= 6 words) |
| `compare` | `left` and `right`: `{"title","icon","items":[text or {text,icon}]}`, 3 to 4 items each |
| `stats` | `stats`: 2 to 4 of `{"value":"3","label","icon"}`; value may have prefix/suffix (`"$1.2M"`, `"95%"`, `"10x"`) and count up |
| `image` | `image` (path returned by fetch_image.py), `credit` (author, licence, source), optional `bullets` (2 to 3) |
| `svg` | `svg`: hand-drawn illustration, see below; optional `bullets` (2 to 3) |
| `outro` | `subtitle` = one-line takeaway |

## Rules
- Content on screen must support the narration: reveal order = order of mention.
- Keep text short; the screen is 1280x720. Nothing may overflow.
- Code: copy from the source exactly; trim imports only if the narration does not need them.
- Mix scene types; avoid two `bullets` scenes in a row.
- `svg` scenes: inline `<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg">` using only `path`, `line`, `polyline`, `polygon`, `circle`, `ellipse`, `rect`, `text`. Stroke-only shapes draw on in order; give shapes `fill="none"` or a fill colour (fades in after outline). Do not set `stroke` unless you want a fixed colour (default is theme gradient). Use `text` for 3 to 6 short labels (`font-size` 16 to 22, `text-anchor="middle"`). Draw in meaningful order (e.g. document -> arrow -> database). Think metaphors: stack of pages, funnel, magnifier over cards, brain + chain, gears.
- `manim` scenes (3Blue1Brown style, `scripts/manim_scene.py`): one class per scene in `jobs/<job>/manim_scenes.py`, `from manim_base import BaseScene, C`. Rules: geometry before algebra; opacity layers (primary 1.0, context `CONTEXT` 0.4, structure `STRUCTURE` 0.15, via `self.layered`); one palette from `C`; `self.beat()` after every reveal; the class runs about the narration length (build pads or trims to the audio, so do not chase exact timings). Equations: `MathTex` needs LaTeX; plain text uses `Text`. Subtitles are burned in from the narration (no word timing), so keep on-screen text short. The clip is rendered 1920x1080, 24 fps, to match the Remotion clips.
- `manim` scene skeleton:
  ```python
  from manim_base import BaseScene, C
  from manim import Create, Write, FadeIn, MathTex
  class Gradient(BaseScene):
      def construct(self):
          self.title("Slope tells the rate")
          axes = self.axes()
          curve = axes.plot(lambda x: 0.5 * x**2, color=C["blue"])
          self.play(Create(axes), run_time=1.5); self.beat(0.5)
          self.play(Create(curve), run_time=2.0); self.beat(1.5)
  ```
- `image` scenes only if a real, relevant, openly licensed image was fetched. Otherwise use `svg` instead.
- Explainer style: each concept scene needs a graphic. Prefer `svg` (analogy drawn as shapes: waiter with tables, conveyor belt, fire alarm, relay runners) or `diagram` for flows. Each `svg` label must match the analogy in the narration. Keep a fresh metaphor per scene.
- `code` pointer example: narration "The function fetch sleeps for one second" with `pointer: [{"line":2,"word":"fetch"},{"line":3,"word":"sleeps"}]`. Every line the narration explains gets a cue; the word must appear in narration exactly.
- Icon names: lucide v1 kebab-case. The build validates them against `scripts/lucide_icons.json` (grep it to find names). Unknown names fail the build with suggestions.
- Run `python scripts/build.py <job> --audio-only` first if you want to check durations cheaply (validation runs there too).
