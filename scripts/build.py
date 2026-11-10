#!/usr/bin/env python3
"""scenes.json -> audio (Kokoro) -> per-scene mp4 (Remotion) -> final.mp4 (ffmpeg concat).

Usage: python scripts/build.py <job> [--only s1,s2] [--audio-only] [--force]
Job dir: jobs/<job>/scenes.json. Outputs: jobs/<job>/build/*.mp4, jobs/<job>/final.mp4
"""
import argparse
import os
from concurrent.futures import ProcessPoolExecutor
import difflib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "models/kokoro-v1.0.int8.onnx"
VOICES = ROOT / "models/voices-v1.0.bin"
PUBLIC = ROOT / "remotion-app/public"
ICONS = set(json.loads((ROOT / "scripts/lucide_icons.json").read_text()))
ALIASES = json.loads((ROOT / "remotion-app/src/icon_aliases.json").read_text())
DEFAULT_VOICE = "am_liam"
GAP = 0.25  # seconds of silence between dialogue lines
TYPES = {"title", "bullets", "code", "diagram", "compare", "stats", "image", "svg", "outro"}

PRONUNCIATIONS = {
    "LlamaIndex": "Llama Index", "LlamaParse": "Llama Parse", "LlamaHub": "Llama Hub",
    "RAG": "rag", "GPU": "G P U", "LLM": "L L M", "LLMs": "L L Ms", "API": "A P I", "JSON": "jason",
    "SDK": "S D K", "OCR": "O C R", "SQL": "sequel", "CLI": "C L I", "PDF": "P D F",
}


def icon_refs(s: dict):
    yield s.get("icon")
    for key in ("bullets", "stats", "nodes"):
        for it in s.get(key) or []:
            if isinstance(it, dict):
                yield it.get("icon")
    for side in (s.get("left"), s.get("right")):
        if side:
            yield side.get("icon")
            for it in side.get("items", []):
                if isinstance(it, dict):
                    yield it.get("icon")


def validate(data: dict) -> None:
    errs = []
    ids = set()
    for i, s in enumerate(data.get("scenes", [])):
        tag = f"scene {i + 1} ({s.get('id', '?')})"
        for k in ("id", "type", "title", "narration"):
            if not s.get(k):
                errs.append(f"{tag}: missing '{k}'")
        if s.get("id") in ids:
            errs.append(f"{tag}: duplicate id")
        ids.add(s.get("id"))
        t = s.get("type")
        if t not in TYPES:
            errs.append(f"{tag}: unknown type '{t}'")
        need = {"code": "code", "diagram": "nodes", "compare": "left", "stats": "stats", "image": "image", "svg": "svg", "bullets": "bullets"}
        if t in need and not s.get(need[t]):
            errs.append(f"{tag}: type '{t}' needs '{need[t]}'")
        if t == "compare" and not s.get("right"):
            errs.append(f"{tag}: compare needs 'right'")
        if t == "image" and s.get("image") and not (PUBLIC / s["image"]).exists():
            errs.append(f"{tag}: image file not found: {s['image']}")
        for ic in icon_refs(s):
            if ic and ic.isascii() and ALIASES.get(ic, ic) not in ICONS:
                near = difflib.get_close_matches(ic, ICONS, n=3)
                errs.append(f"{tag}: unknown icon '{ic}' (try: {', '.join(near) or 'see scripts/lucide_icons.json'})")
        nar = s.get("narration", "")
        words = len(nar.split()) if isinstance(nar, str) else sum(len(l.get("text", "").split()) for l in nar)
        if words > 70:
            print(f"warn {tag}: narration is {words} words (target 25-55)")
    if not data.get("scenes"):
        errs.append("no scenes")
    if errs:
        sys.exit("scenes.json invalid:\n  " + "\n  ".join(errs))


_K = None


def _init_worker(threads: int) -> None:
    global _K
    import onnxruntime as ort
    from kokoro_onnx import Kokoro

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    _K = Kokoro.from_session(ort.InferenceSession(str(MODEL), sess_options=opts), str(VOICES))


def _synth(task: tuple) -> tuple[str, float]:
    """Runs in a worker process: dialogue lines -> one wav. Returns (scene id, seconds)."""
    sid, wav, stamp, key, resolved, speed, pron = task
    chunks, sr = [], 24000
    for v, text in resolved:
        for w, spoken in pron.items():
            text = text.replace(w, spoken)
        samples, sr = _K.create(text, voice=v, speed=speed, lang="en-us")
        chunks += [samples, np.zeros(int(sr * GAP), dtype=samples.dtype)]
    audio = np.concatenate(chunks[:-1])
    sf.write(wav, audio, sr)
    Path(stamp).write_text(key, encoding="utf-8")
    return sid, round(len(audio) / sr, 2)


def make_audio(job: str, data: dict, workers: int | None = None) -> None:
    out_dir = PUBLIC / "audio" / job
    out_dir.mkdir(parents=True, exist_ok=True)
    voice = data.get("voice", DEFAULT_VOICE)
    speed = data.get("speed", 1.0)
    pron = {**PRONUNCIATIONS, **data.get("pronunciations", {})}
    voices = data.get("voices", {})  # speaker label -> kokoro voice, e.g. {"A": "af_heart", "B": "am_michael"}
    pending, by_id = [], {}
    for s in data["scenes"]:
        # narration: a string, or a list of {"speaker","text"} (dialogue). Scene "speaker" picks the voice for a string.
        if isinstance(s["narration"], list):
            lines = [(l.get("speaker"), l["text"]) for l in s["narration"]]
        else:
            lines = [(s.get("speaker"), s["narration"])]
        s["narration"] = " ".join(t for _, t in lines)
        resolved = [(voices.get(sp, sp) if sp else voice, t) for sp, t in lines]  # sp may be a raw voice id too
        wav = out_dir / f"{s['id']}.wav"
        stamp = out_dir / f"{s['id']}.txt"
        key = f"{speed}|{resolved}|{sorted(pron.items())}|{GAP}"
        s["audio"] = f"audio/{job}/{s['id']}.wav"
        by_id[s["id"]] = s
        if wav.exists() and stamp.exists() and stamp.read_text(encoding="utf-8") == key:
            info = sf.info(wav)
            s["duration"] = round(info.frames / info.samplerate, 2)
            print("audio cached", s["id"], s["duration"])
        else:
            pending.append((s["id"], str(wav), str(stamp), key, resolved, speed, pron))
    if not pending:
        return
    cores = os.cpu_count() or 2
    threads = 2
    workers = max(1, min(len(pending), workers or cores // threads))
    print(f"synthesizing {len(pending)} scene(s) with {workers} worker(s) x {threads} threads")
    with ProcessPoolExecutor(workers, initializer=_init_worker, initargs=(threads,)) as ex:
        for sid, dur in ex.map(_synth, pending):
            by_id[sid]["duration"] = dur
            print("audio made  ", sid, dur)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("--only", help="comma separated scene ids to render")
    ap.add_argument("--audio-only", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--out", help="also copy final.mp4 to this path (the skill uses <md folder>/<md name>.mp4)")
    ap.add_argument("--workers", type=int, help="parallel audio processes (default cores/2)")
    ap.add_argument("--parallel", type=int, default=2, help="scenes rendered at once (default 2)")
    a = ap.parse_args()

    jobdir = ROOT / "jobs" / a.job
    data = json.loads((jobdir / "scenes.json").read_text(encoding="utf-8"))
    validate(data)
    make_audio(a.job, data, a.workers)
    resolved = jobdir / "scenes.resolved.json"
    resolved.write_text(json.dumps(data, indent=2), encoding="utf-8")
    if a.audio_only:
        return

    build = jobdir / "build"
    cmd = ["node", "render.mjs", str(resolved), str(build), "--parallel", str(a.parallel)]
    if a.only:
        cmd += ["--only", a.only]
    if a.force:
        cmd.append("--force")
    subprocess.run(cmd, cwd=ROOT / "remotion-app", check=True)

    clips = sorted(build.glob("*.mp4"))
    expected = [f"{i + 1:02d}-{s['id']}.mp4" for i, s in enumerate(data["scenes"])]
    clips = [build / n for n in expected if (build / n).exists()]
    if len(clips) != len(expected):
        print("not all scenes rendered; skipping concat")
        return
    lst = build / "concat.txt"
    lst.write_text("".join(f"file '{c.resolve()}'\n" for c in clips), encoding="utf-8")
    final = jobdir / "final.mp4"
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(final)])
    if r.returncode:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                        "-c:v", "libx264", "-c:a", "aac", str(final)], check=True)
    if a.out:
        import shutil

        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(final, a.out)
        print("COPIED", a.out)
    print("DONE", final)


if __name__ == "__main__":
    main()
