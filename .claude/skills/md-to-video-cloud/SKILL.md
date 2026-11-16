---
name: md-to-video-cloud
description: Cloud-agent variant of md-to-video. Turns a markdown file into a narrated, animated mp4 with no user interaction, no sudo, resumable, and publishes the mp4 out of the ephemeral sandbox. Use in Claude cloud/unattended sessions when the user gives a .md file and wants a video.
---

# md-to-video-cloud

Same pipeline as `md-to-video` (`../md-to-video/SKILL.md`), adapted for unattended cloud sandboxes. Reuse its prompts: `../md-to-video/prompts/script.md`, `../md-to-video/prompts/scenes.md`, `../md-to-video/prompts/subagent_scenes.md`. Do not edit the original skill.

Pipeline root `$P` = repo root (contains `.claude/`, `scripts/`, `remotion-app/`). Always `cd $P` first.
Input: path to a `.md` file in the repo (argument). Optional hints in the prompt: theme, voice, style, conversation style, resolution, output destination.

## Differences from md-to-video
- **No questions.** Never call AskUserQuestion. Use defaults unless the prompt says otherwise:
  - theme: sketchnote (`dark technical` only if the prompt asks for it)
  - voice: `am_liam`
  - video style: technical educational
  - conversation style: rephrased narration (other options: `Interview`, `Direct passthrough`, `Explainer`, only if the prompt names one; see `../md-to-video/prompts/script.md`). `Explainer` = Feynman ladder with analogies: mechanism before name, one honest analogy with its break point, one example, the term defined at first use, depth up one rung per section, simplify is not falsify.
  - captions on
- **No sudo, no `!` prefix.** Install everything in user space (see Setup).
- **Manim scenes need system packages the cloud sandbox may not have** (cairo and pango headers, LaTeX). Check first: `.venv/bin/python -c "import manim"`. If it fails and sudo is unavailable, do not stop: convert each `manim` scene to an `svg` or `diagram` scene that carries the same idea, keep the narration, and say so in the report. Only keep `manim` scenes when the check passes.
- **Resolution:** always 1080p (`"width": 1920`), matching the md-to-video standing rule. Use 1280 only if the prompt asks for a smaller or faster render, or if the sandbox has 4 cores or fewer (state it in the report).
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
   - Manim (only for `manim` scenes): `pip install manim` in `.venv` (needs cairo headers; see the Manim check under Differences). LaTeX only if the scenes use `MathTex`; otherwise plain `Text` works.
   - `cd remotion-app && npm install`; Remotion fetches headless Chrome on first render. If Chrome fails on missing shared libs, try `npx remotion browser ensure`; as last resort report the missing libs and stop.
   - Re-run `check_deps.py` until it passes. Network failure: retry 3 times, then report and stop.

3. **Set up job.** `job` = kebab-case slug of the md filename. `mkdir -p jobs/<job>`; copy md to `jobs/<job>/source.md` if absent. Note the md's line count and word count (`wc -w`) and estimate length: words / 2.6 / 60 minutes is a floor; Q&A and table-heavy docs run about 1.4x that (narration gets longer than the source). Warn in the report if the estimate is over 30 minutes.

4. **Script.** Follow `../md-to-video/prompts/script.md` for the chosen conversation style. Interview style: two subagents first (questions and answers, both reading `source.md` only), then merge into `A:` / `B:` lines. Write `jobs/<job>/script.md`, with a `## Pronunciations` list of every technical term and acronym. No review stop.

4b. **Pronunciation pass.** Check each term in `scripts/pronunciations_seed.json` and `build.py` PRONUNCIATIONS first, and add missing ones to `jobs/<job>/pronunciations.json` (e.g. `"SQL": "sequel"`, `"GraphQL": "graph Q L"`). The map must be final before audio runs: the audio cache key includes the whole map, so a later change re-synthesizes every scene. Keys are case sensitive and whole word.

5. **Scenes.** Follow `../md-to-video/prompts/scenes.md`. Write `jobs/<job>/scenes.json` with `"captions": true`, `"width": 1920` (or 1280 per the rule above), `"voice"`. Images only via `python scripts/fetch_image.py <job> <url> <name> "<credit>"`; skip if none good. Explainer style: every main idea gets a graphic. Everyday analogies use `svg` (drawn metaphor) or `diagram` (flows), image last. Math, equations, algorithm steps and graphs use `manim` (3Blue1Brown style): `scenes.json` entry with `"manim": "<ClassName>"`, class in `jobs/<job>/manim_scenes.py` subclassing `BaseScene` from `scripts/manim_base.py` (one palette, opacity layers, `self.beat()` after each reveal). Code scenes need `pointer` entries (not rendered yet, so also set `highlight`). Then run the coverage check: walk the md section by section, confirm every fact is in narration.
   - **Long md (more than about 2,500 words or 40+ scenes): parallel subagents.** Split `source.md` at `## ` boundaries (`grep -n '^## ' source.md`) into chunks of about 700 to 1,500 words, one subagent each, all launched in one turn. Brief each with `../md-to-video/prompts/subagent_scenes.md` (fill in job, line range, id prefix p1, p2, ...). The first chunk owns the `title` scene, the last owns the `outro`. Each writes `jobs/<job>/parts/script_N.md` and `parts/scenes_N.json` and checks it with `.venv/bin/python scripts/check_part.py <file>`. Then `python scripts/merge_parts.py <job> [--theme sketchnote]` writes `scenes.json` and `script.md` and reports scene count, duplicate ids and minutes. Agents return word lists for pronunciations, not files: merge those into `pronunciations.json` before audio runs.
   - Manim scene count and subtitles: build.py burns subtitles from narration for manim clips (spread by character count, no word timing), so keep on-screen text short.
   - For very long md, a subagent may write scenes via a small Python generator in the scratchpad to cut output size. Emit script.md from the same data.

6. **Build (background).**
   - Validate and audio first: `source .venv/bin/activate && python scripts/build.py <job> --audio-only --workers $W` (background). Fix validation errors (unknown icon: grep `scripts/lucide_icons.json`; over 110 words: split the scene).
   - Then full build (background): `python scripts/build.py <job> --parallel $R --out jobs/<job>/final.mp4`. Rendering needs audio durations, so audio runs first.
   - Partial output (prompt asks for "the first N scenes"): `python scripts/build.py <job> --first N --out jobs/<job>/final.part.mp4`. It never touches `final.mp4`. Note: `--first` still synthesizes audio for all scenes.
   - A scene's render hash includes every file in `remotion-app/src`. Finish template edits before the big render; do not edit `src` while a render runs.
   - If the session ends mid-build, relaunch the same command; cached scenes are skipped.
   - Status: a monitor loop echoes `scenes done N/M` every 60 s. Count audio from `remotion-app/public/audio/<job>/*.txt` and renders from `jobs/<job>/build/*.hash` (not mp4 files; killed renders leave partial mp4s). Wait on process with the bracket trick (`pgrep -f "[b]uild.py"`), never a bare pattern that matches your own shell.
   - Stop a render: kill the build shell and `pkill -f "[r]ender.mjs"`. Finished scenes stay cached.

7. **Publish.** In order of availability, do all that apply:
   - Keep `jobs/<job>/final.mp4`. Commit-friendly: if the repo allows large files, `git add -f jobs/<job>/final.mp4 jobs/<job>/scenes.json jobs/<job>/script.md` and commit to a new branch `video/<job>` (only commit/push if the prompt authorises it).
   - If the prompt names a destination (bucket, release, artifact, path), upload there.
   - If the mp4 is under the Artifact size limit and an Artifact tool exists, publish a page with an HTML5 `<video>` and the file via `files`. A 1080p mp4 of long narration is usually over the limit; then use the other options.
   - Otherwise state the exact path and that the sandbox is ephemeral.

8. **Verify.** `ffprobe` duration ~ sum of scene durations (final is about 0.6 s per scene longer: scene padding). Extract 3 frames with ffmpeg and Read them to check layout (text overflow, empty areas). Rebuild only affected scenes.

9. **Report (terse).** Path or URL of the mp4, duration, scene count, resolution, images and credits, anything skipped.

## Notes
- Heavy: a 100-minute video took about 70 minutes to render at `--parallel 5` on a large machine (about 4.6 scenes a minute at 1080p). Warn in the report if cores are few; consider splitting the md into several jobs and concatenating, or lowering width to 1280.
- Pronunciations go in `jobs/<job>/pronunciations.json` (or `"pronunciations"` in scenes.json). Mispronounced word later: add it, then rebuild (only that word's scenes re-synthesize if it is in scenes.json).
- Never write digits or symbols in narration; numbers as words.
- Titles: a section opener typed `title` mid-video renders like the opening title. Prefer `bullets` or `svg` for mid-video openers.
- Kokoro and Remotion are free for this use (individual/small team licence).
- Full rules, sketchnote style and the learnings log live in `../md-to-video/SKILL.md`. Read its Learnings section before a long job.
- Manim pipeline (2026-11-16): `scripts/manim_scene.py` renders, muxes and burns subtitles; `build.py` treats `type: manim` like other scenes (cached by content hash). Not yet verified end to end (no cairo or LaTeX on the dev machine), so the first cloud run with manim scenes should check one scene's clip with ffprobe before the full build.
- Clone github.com/omkar1728/AI-video_generator for setup
- Use parallel agents to speed up execution
- As the individual video parts are generated, chunk it into playable segments of less than 3MB and upload each of them to google drive using the connector. In the folder named claude create a new folder name in format <Date>-topic name and place all the segments there.
