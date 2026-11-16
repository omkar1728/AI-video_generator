"""Manim scene support for build.py.

A scene with "type": "manim" is drawn by Manim CE instead of Remotion (math, equations,
algorithm walkthroughs, graphs). This module renders the Manim class, pads or trims the
picture to the narration length, burns the subtitles, and muxes the Kokoro audio so the
clip matches the Remotion clips (h264, 24 fps, AAC 48 kHz stereo, same resolution).

Job file: jobs/<job>/manim_scenes.py, one class per manim scene, class name = scene["manim"].
The job file may import scripts/manim_base.py (build.py puts scripts/ on PYTHONPATH).
"""
import hashlib
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAD_SECONDS = 0.6  # same tail padding as remotion-app/src/SceneVideo.tsx PAD_SECONDS
FPS = 24
CHUNK_CHARS = 66


def manim_bin() -> list[str]:
    venv = ROOT / ".venv/bin/manim"
    return [str(venv)] if venv.exists() else ["manim"]


def job_source(job: str) -> Path:
    return ROOT / "jobs" / job / "manim_scenes.py"


def _template_hash() -> str:
    """Changes to the shared Manim base module re-render every manim scene."""
    return hashlib.sha1((ROOT / "scripts/manim_base.py").read_bytes()).hexdigest()


def scene_hash(job: str, scene: dict, duration: float, width: int, captions: bool) -> str:
    src = job_source(job).read_bytes()
    payload = "|".join([
        hashlib.sha1(src).hexdigest(), scene["manim"], f"{duration:.2f}", str(width),
        str(captions), _template_hash(), scene.get("narration", ""),
    ])
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def chunk_narration(text: str, max_chars: int = CHUNK_CHARS) -> list[str]:
    """Same subtitle chunking idea as the Remotion Captions component (sentence, then comma or space)."""
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.findall(r"[^.!?;:]+[.!?;:]?\s*", text) or [text]
    out: list[str] = []
    for sent in sentences:
        rest = sent.strip()
        while len(rest) > max_chars:
            mid = min(max_chars, len(rest) // 2 + 10)
            cut = rest.rfind(", ", 0, mid)
            cut = cut + 1 if cut >= 20 else rest.rfind(" ", 0, mid)
            if cut < 20:
                cut = rest.find(" ", mid)
            if cut < 0:
                break
            out.append(rest[:cut].strip())
            rest = rest[cut:].strip()
        if rest:
            out.append(rest)
    return out


def _srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(narration: str, spoken: float, path: Path) -> None:
    """Spread subtitle chunks over the spoken length, weighted by length (no word timings here)."""
    chunks = chunk_narration(narration)
    weights = [len(c) + 12 for c in chunks]
    total = sum(weights) or 1
    t, lines = 0.0, []
    for i, (c, w) in enumerate(zip(chunks, weights), 1):
        end = t + spoken * w / total
        lines.append(f"{i}\n{_srt_time(t)} --> {_srt_time(end)}\n{c}\n")
        t = end
    path.write_text("\n".join(lines), encoding="utf-8")


def render_manim(job: str, scene: dict, media_dir: Path, width: int) -> Path:
    """Run Manim for one scene class. Returns the silent mp4 Manim wrote."""
    height = round(width * 9 / 16)
    quality = f"{width},{height}"
    cmd = manim_bin() + [
        "render", str(job_source(job)), scene["manim"],
        "--format", "mp4", "-r", quality, "--frame_rate", str(FPS),
        "--media_dir", str(media_dir), "-o", f"{scene['id']}.mp4", "--disable_caching",
        "--progress_bar", "none", "--verbosity", "WARNING",
    ]
    env = {**os.environ, "PYTHONPATH": str(ROOT / "scripts")}
    subprocess.run(cmd, cwd=ROOT / "jobs" / job, env=env, check=True)
    found = sorted(media_dir.rglob(f"{scene['id']}.mp4"), key=lambda p: p.stat().st_mtime)
    if not found:
        raise RuntimeError(f"manim produced no mp4 for {scene['id']} (class {scene['manim']})")
    return found[-1]


def mux(silent: Path, wav: Path, spoken: float, srt: Path | None, out: Path, width: int) -> None:
    """Make the clip spoken + PAD_SECONDS long: freeze last frame, burn subtitles, add audio."""
    total = spoken + PAD_SECONDS
    vf = [f"tpad=stop_mode=clone:stop_duration={total + 5:.2f}", f"trim=duration={total:.2f}",
          "setpts=PTS-STARTPTS", f"fps={FPS}", f"scale={width}:{round(width * 9 / 16)}", "format=yuv420p"]
    if srt is not None:
        style = ("FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF,BorderStyle=3,"
                 "OutlineColour=&HB8000000,BackColour=&HB8000000,Alignment=2,MarginV=40")
        # ffmpeg filter args: escape the path for the filtergraph
        esc = str(srt).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        vf.append(f"subtitles='{esc}':force_style='{style}'")
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-i", str(silent), "-i", str(wav),
        "-filter_complex", f"[0:v]{','.join(vf)}[v];[1:a]apad,atrim=duration={total:.2f},aresample=48000,aformat=channel_layouts=stereo[a]",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", f"{total:.2f}", str(out),
    ]
    subprocess.run(cmd, check=True)


def build_manim_clip(job: str, scene: dict, spoken: float, wav: Path, out: Path,
                     width: int, captions: bool, build_dir: Path) -> None:
    media = build_dir / "manim_media" / scene["id"]
    media.mkdir(parents=True, exist_ok=True)
    silent = render_manim(job, scene, media, width)
    srt = None
    if captions:
        srt = build_dir / f"{scene['id']}.srt"
        write_srt(scene["narration"], spoken, srt)
    mux(silent, wav, spoken, srt, out, width)
    if shutil.which("ffprobe"):
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=nw=1:nk=1", str(out)], capture_output=True, text=True)
        got = float(r.stdout.strip() or 0)
        if abs(got - (spoken + PAD_SECONDS)) > 0.2:
            print(f"warn {scene['id']}: clip is {got:.2f}s, expected {spoken + PAD_SECONDS:.2f}s")
