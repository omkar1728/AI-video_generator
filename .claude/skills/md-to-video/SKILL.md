---
name: md-to-video
description: Turn a markdown document into a narrated, animated explainer mp4 (script, scenes.json, Kokoro voice, Remotion scenes, ffmpeg concat). Use when the user gives a .md file and wants a video overview.
---

# md-to-video

Pipeline root: the git repo root (the folder that contains `.claude/`, `scripts/`, `remotion-app/`; call it `$P`). Always `cd $P` first.
Input: path to a `.md` file (argument). Optional user hints: length, audience, voice, captions, style.

## Steps

-1. **Dependency check.** `cd $P && python3 scripts/check_deps.py`. If it exits non-zero, read `$P/README.md`, do its Setup section for the missing items only (tell the user what you are installing; `sudo` steps: ask the user to run them with the `!` prefix), rerun the check until it passes, then continue. Network is needed for setup.

0. **Ask preferences first** (one AskUserQuestion call, 3 questions; skip any the user already answered in their message):
   - **Theme:** options `Dark technical (Recommended)` = default; `Custom` = user describes it (follow up with a free-text question if they pick Other/Custom and gave no detail). Map the description to the `theme` object in `prompts/scenes.md` (mode, bg, text, muted, 2 to 4 accent gradient pairs).
   - **Voice:** options `Default: am_liam (Recommended)`; `Pick another voice` (offer af_heart, af_bella, bf_emma, am_michael, bm_george; any id from `python scripts/test_voice.py --list` works); `Multiple voices / two hosts` (then ask for the voices).
   - **Video style:** options `Technical educational (Recommended)` = default; `Custom` (follow up asking what style: e.g. marketing pitch, casual explainer, executive summary, storytelling; also ask target length only if they care). Style steers tone, depth and scene mix in the script.
1. **Set up job.** `job` = kebab-case slug of the md filename. `mkdir -p $P/jobs/<job>`; copy md to `jobs/<job>/source.md` (skip if already there). Remember the md's absolute path and folder.
2. **Script.** Read `source.md` fully. Follow `prompts/script.md` (next to this file). Write `jobs/<job>/script.md`. Show the user a 3-line summary of the scene plan; do not stop unless they asked for review.
3. **Scenes.** Follow `prompts/scenes.md`. Write `jobs/<job>/scenes.json`.
   - Images: find openly licensed images online (WebSearch), download ONLY via `python scripts/fetch_image.py <job> <url> <name> "<credit>"`. Skip images if none are good; never fabricate URLs.
4. **Build.** `source .venv/bin/activate && python scripts/build.py <job> --out "<md folder>/<md name>.mp4"`. Runs: validate, Kokoro audio (cached), Remotion per-scene mp4 (cached by content hash), ffmpeg concat to `jobs/<job>/final.mp4`.
   - Validation errors: fix `scenes.json`, rerun.
   - Preview one scene fast: `python scripts/build.py <job> --only <scene-id>`.
   - First look: `cd remotion-app && npx remotion still Scene out/f.png --props=<file> --frame=90` or `npx remotion studio`.
5. **Verify.** `ffprobe` final duration ~ sum of scene durations. Extract 3 frames with ffmpeg and view them with Read to check layout (text overflow, empty areas). Fix and rebuild only affected scenes.
6. **Report.** The final video is saved next to the source md as `<md folder>/<md name>.mp4` (also kept at `jobs/<job>/final.mp4`). Report that path, duration, scene list, any images and their credits. Terse.

## Editing later
- Change narration/visuals of one scene: edit `scenes.json`, rerun build. Only that scene's audio and video regenerate.
- Voices: single `"voice"`, or `"voices"` map + per-scene `"speaker"` / dialogue `narration` list (see prompts/scenes.md). Ask the user for host voices if they want more than one.
- Default voice is `am_liam`. Change voice: set `"voice"` (list with `python scripts/test_voice.py --list`). Mispronounced word: add to `"pronunciations"` in scenes.json.
- Studio preview: `cd remotion-app && npx remotion studio`.

## Notes
- Kokoro is CPU, int8 model. Audio runs in parallel (`--workers N`, default cores/2, 2 threads each); renders run `--parallel N` scenes at once (default 2) using ~80% of cores. Override with `"concurrency"` (tabs per render) in scenes.json. Default size 1280x720; set `"width"`/`"height"` to change.
- Remotion licence: free for individuals/small teams.
