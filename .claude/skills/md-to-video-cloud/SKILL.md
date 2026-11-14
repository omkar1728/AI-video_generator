---
name: md-to-video-cloud
description: Cloud-agent variant of md-to-video. Turns a markdown file into a narrated, animated mp4 with no user interaction, no sudo, resumable, and publishes the mp4 out of the ephemeral sandbox. Use in Claude cloud/unattended sessions when the user gives a .md file and wants a video.
---

# md-to-video-cloud

Same pipeline as `md-to-video` (`../md-to-video/SKILL.md`), adapted for unattended cloud sandboxes. Reuse its prompts: `../md-to-video/prompts/script.md` and `../md-to-video/prompts/scenes.md`. Do not edit the original skill.

Pipeline root `$P` = repo root (contains `.claude/`, `scripts/`, `remotion-app/`). Always `cd $P` first.
Input: path to a `.md` file in the repo (argument). Optional hints in the prompt: theme, voice, style, resolution, output destination.

## Differences from md-to-video
- **No questions.** Never call AskUserQuestion. Use defaults unless the prompt says otherwise: theme dark technical, voice `am_liam`, style technical educational, captions on.
- **No sudo, no `!` prefix.** Install everything in user space (see Setup).
- **Resolution:** default 1280x720 (`"width": 1280`) to save CPU/time; use 1920 only if the prompt asks.
- **Resource-aware:** size workers from the sandbox, not a fixed number.
- **Long jobs in background shells** (`run_in_background: true`), wait for the completion notification, never poll or sleep. Re-launch if a session timeout kills them; caches make rebuilds resume.
- **Persist output.** The sandbox disk is ephemeral. Always publish the mp4 (see Step 7).
- **Lossless content, subtitles on** (same standing rules as the original).

## Steps

1. **Resources.** `nproc; free -g; df -h .`. Set `W` (audio workers) = max(1, cores/2), `R` (render parallel) = max(1, cores/4). With <=4 cores use `W=2 R=1`.

2. **Setup, user-space only.**
   - `python3 scripts/check_deps.py`. If it passes, skip to 3.
   - ffmpeg missing: `pip install imageio-ffmpeg` and symlink: `ln -sf "$(python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')" ~/.local/bin/ffmpeg` (add `~/.local/bin` to PATH; ffprobe: use `ffmpeg -i` or download a static build from johnvansickle.com/ffmpeg into `~/.local/bin`).
   - Node missing or too old: `curl -fsSL https://fnm.vercel.app/install | bash` or download the Node 22 tarball from nodejs.org into `~/.local` and add to PATH.
   - Python venv: `python3 -m venv .venv` (if `ensurepip` missing: `pip install --user virtualenv && virtualenv .venv`), then `. .venv/bin/activate && pip install -r requirements.txt`.
   - Kokoro models: follow README step 3 (curl into `models/`; skip if present).
   - `cd remotion-app && npm install`; Remotion fetches headless Chrome on first render. If Chrome fails on missing shared libs, try `npx remotion browser ensure`; as last resort report the missing libs and stop.
   - Re-run `check_deps.py` until it passes. Network failure: retry 3 times, then report and stop.

3. **Set up job.** `job` = kebab-case slug of the md filename. `mkdir -p jobs/<job>`; copy md to `jobs/<job>/source.md` if absent.

4. **Script.** Follow `../md-to-video/prompts/script.md`. Write `jobs/<job>/script.md`. No review stop.

5. **Scenes.** Follow `../md-to-video/prompts/scenes.md`. Write `jobs/<job>/scenes.json` with `"captions": true`, `"width": 1280` (or 1920), `"voice"`. Images only via `python scripts/fetch_image.py <job> <url> <name> "<credit>"`; skip if none good. For very long md, write scenes via a small Python generator file in the scratchpad (helper functions per scene type) to cut output size, and emit script.md from the same data. Then run the coverage check: walk the md section by section, confirm every fact is in narration.

6. **Build (background).**
   - Validate and audio first: `source .venv/bin/activate && python scripts/build.py <job> --audio-only --workers $W` (background). Fix validation errors (unknown icon: grep `scripts/lucide_icons.json`; over 110 words: split the scene).
   - Then full build (background): `python scripts/build.py <job> --parallel $R --out jobs/<job>/final.mp4`. Rendering needs audio durations, so audio runs first.
   - If the session ends mid-build, relaunch the same command; cached scenes are skipped.

7. **Publish.** In order of availability, do all that apply:
   - Keep `jobs/<job>/final.mp4`. Commit-friendly: if the repo allows large files, `git add -f jobs/<job>/final.mp4 jobs/<job>/scenes.json jobs/<job>/script.md` and commit to a new branch `video/<job>` (only commit/push if the prompt authorises it).
   - If the prompt names a destination (bucket, release, artifact, path), upload there.
   - If the mp4 is under the Artifact size limit and an Artifact tool exists, publish a page with an HTML5 `<video>` and the file via `files`.
   - Otherwise state the exact path and that the sandbox is ephemeral.

8. **Verify.** `ffprobe` duration ~ sum of scene durations. Extract 3 frames with ffmpeg and Read them to check layout. Rebuild only affected scenes.

9. **Report (terse).** Path or URL of the mp4, duration, scene count, resolution, images and credits, anything skipped.

## Notes
- Heavy: ~52 min of video took long even on 20 cores. Warn in the report if cores are few; consider splitting the md into several jobs and concatenating, or lowering width.
- Pronunciations go in `scenes.json` `"pronunciations"` (e.g. `"MCP": "M C P"`).
- Kokoro and Remotion are free for this use (individual/small team licence).
