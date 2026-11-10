# Prompt: script.md -> scenes.json

Convert `script.md` (+ `source.md` for exact code and facts) into `scenes.json`. Output valid JSON only, saved to the job dir.

## Top level
```json
{ "title": "...", "voice": "am_liam", "voices": {"A": "af_heart", "B": "am_michael"}, "captions": false, "pronunciations": {"Term": "spoken form"}, "scenes": [ ... ] }
```
Voices: single narrator = `"voice"` only (default `am_liam`). Multiple voices = `"voices"` map of speaker label to Kokoro voice (female e.g. `af_heart`, `af_bella`, `bf_emma`; male e.g. `am_michael`, `am_adam`, `bm_george`) and per scene either `"speaker": "A"` (whole narration) or `"narration": [{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]` for dialogue within a scene. Use multiple voices only when the user asks (e.g. "two hosts"); for hosts, A leads and B reacts or adds the detail, and avoid more than 3 lines per scene. Set `"captions": true` only if asked.

## Theme (optional; omit for the default dark technical look)
`"theme": {"mode": "dark"|"light", "bg": "#hex", "text": "#hex", "muted": "#hex", "palettes": [["#accentA","#accentB"], ...]}`
Palettes (2 to 4 pairs) cycle per scene. Keep strong contrast between bg and text. Examples: light clean = `{"mode":"light","palettes":[["#0ea5e9","#6366f1"],["#db2777","#f97316"]]}`; warm = dark with `bg "#1a0f0a"` and orange/amber pairs. Only set fields you need.

## Scene fields
Common: `id` (`s1-hook`, unique, kebab), `type`, `title` (<= 6 words), `icon` (lucide icon name, kebab-case, e.g. `database`, `brain-circuit`, `search`, `file-text`, `server`, `cloud`, `shield-check`, `rocket`, `puzzle`, `layers`, `git-branch`, `zap`, `bot`, `book-open`; an emoji also works), `narration` (verbatim from script; string or dialogue list).

| type | extra fields |
|---|---|
| `title` | `subtitle` |
| `bullets` | `bullets`: 3 to 5 items, each `"text"` or `{"text","icon"}`; <= 4 words each; give every item its own icon |
| `code` | `code` (real snippet from the source, <= 12 lines, <= 70 chars per line), `language`, `filename`, `highlight` (1-based line numbers to spotlight after typing), `caption` (one takeaway line) |
| `diagram` | `nodes`: `[{"id","label"(<=2 words),"icon","col","row"}]` (grid; omit col/row for a left-to-right chain; max 6 columns, 3 rows), `edges`: `[["from","to","optional label"]]` by node id, `caption`. Fan-out example: source at col 0,row 1; three nodes at col 1,rows 0..2; sink at col 2,row 1 |
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
- `image` scenes only if a real, relevant, openly licensed image was fetched. Otherwise use `svg` instead.
- Icon names: lucide v1 kebab-case. The build validates them against `scripts/lucide_icons.json` (grep it to find names). Unknown names fail the build with suggestions.
- Run `python scripts/build.py <job> --audio-only` first if you want to check durations cheaply (validation runs there too).
