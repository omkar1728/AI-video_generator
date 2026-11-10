# md-to-video pipeline

Markdown -> script -> `scenes.json` -> Kokoro voice (CPU) -> Remotion scenes -> one mp4. Runs fully local on Linux, no GPU, no paid services. Driven by the Claude Code skill `md-to-video` (`../.claude/skills/md-to-video/`).

## Requirements

| Tool | Version | Notes |
|---|---|---|
| Python | 3.10+ | with `venv` (`apt install python3-venv` on Debian/Ubuntu) |
| Node.js + npm | 20.19+ or 22.13+ | Remotion requirement |
| ffmpeg + ffprobe | any recent | `apt install ffmpeg` |
| Disk | about 1.5 GB | models 120 MB, node_modules, Remotion's headless Chrome |
| Network | first setup only | pip, npm, model download, Chrome download. Rendering is offline afterwards (image scenes need network only when fetching images) |

Check what is missing at any time (no venv needed):

```bash
python3 scripts/check_deps.py
```

## Setup

Run from the repo root. Skip steps that `check_deps.py` already reports ok.

### 1. System tools
```bash
sudo apt install -y ffmpeg python3-venv      # Debian/Ubuntu
# Node 20.19+ / 22.13+: https://nodejs.org or `nvm install 22`
```

### 2. Python venv and packages
```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

### 3. Kokoro model files (about 120 MB)
```bash
mkdir -p models
B=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
curl -L -o models/kokoro-v1.0.int8.onnx $B/kokoro-v1.0.int8.onnx
curl -L -o models/voices-v1.0.bin       $B/voices-v1.0.bin
```
The int8 model is the one the pipeline uses (smaller, faster on CPU). If the URLs change, find "model-files" on the kokoro-onnx GitHub releases page.

### 4. Remotion project dependencies
```bash
cd remotion-app && npm install && cd ..
```
Remotion downloads a headless Chrome on the first render. That needs network once.

### 5. Icon list
`scripts/lucide_icons.json` (valid icon names, used by validation) is committed with the project. If it is missing, regenerate:
```bash
cd remotion-app && node -e '
const {icons}=require("lucide-react");
const kebab=n=>n.replace(/([a-z0-9])([A-Z])/g,"$1-$2").replace(/([A-Za-z])(\d)/g,"$1-$2").toLowerCase();
require("fs").writeFileSync("../scripts/lucide_icons.json",JSON.stringify(Object.keys(icons).map(kebab)));' && cd ..
```

### 6. Verify
```bash
python3 scripts/check_deps.py                          # all ok
. .venv/bin/activate && python scripts/test_voice.py   # writes test.wav (default voice af_heart; pass a voice id as argument)
```

## Usage

Normally via the skill: invoke `md-to-video` with a markdown file. It asks for theme, voice and style, writes the script and `scenes.json`, builds, and saves `<md name>.mp4` next to the markdown.

Manual build of an existing job (`jobs/<job>/scenes.json`):
```bash
. .venv/bin/activate
python scripts/build.py <job> --out /path/to/output.mp4
```
Options: `--only s1,s2` (render only these scenes), `--audio-only`, `--force` (ignore render cache), `--workers N` (parallel audio processes, default cores/2), `--parallel N` (scenes rendered at once, default 2).

Preview in a browser: `cd remotion-app && npx remotion studio`.

## Layout

```
md-to-video/
  README.md  requirements.txt
  .claude/skills/md-to-video/   the Claude Code skill (prompts + workflow)
  models/                  Kokoro model + voices (not in git)
  scripts/
    build.py               audio -> render -> concat
    check_deps.py          dependency check
    fetch_image.py         download web images for image scenes (+ credits)
    test_voice.py          list voices (--list) or test one
    lucide_icons.json      valid icon names
  remotion-app/
    render.mjs             per-scene renderer (cached by content hash)
    src/                   scene components, theme, types
    public/audio, images/  generated audio and fetched images (per job)
  jobs/<job>/              source.md, script.md, scenes.json, build/, final.mp4
```

## Troubleshooting

- **`unknown icon`** during build: use a name from `scripts/lucide_icons.json` (the error suggests close matches). Lucide v1 renamed some icons.
- **Kokoro cannot find model files:** names must match `models/kokoro-v1.0.int8.onnx` and `models/voices-v1.0.bin`.
- **Mispronounced word:** add it to `"pronunciations"` in `scenes.json` and rebuild.
- **Render slow or machine freezes:** lower `--parallel` or set `"concurrency"` (browser tabs per render) in `scenes.json`.
- **Chrome download fails / no network at render:** run one render online first, or set `BROWSER_EXECUTABLE`/`browserExecutable` to a local Chrome.
- **Voices that are not English** (Spanish, Hindi, Japanese, Mandarin...) read English text with an accent by design in this pipeline.

## Licences

Kokoro: Apache 2.0. Remotion: free for individuals and small teams, paid for larger companies (check remotion.pro/license). Fetched images keep their own licences; credits are written to `remotion-app/public/images/<job>/CREDITS.txt` (generated, not tracked).
