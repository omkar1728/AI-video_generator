#!/usr/bin/env python3
"""Merge parts written by parallel scene-writing subagents into scenes.json and script.md.

Usage: python scripts/merge_parts.py <job> [--title T] [--voice am_liam] [--theme sketchnote]
Reads jobs/<job>/parts/scenes_N.json (arrays) and script_N.md in numeric order.
Pronunciations: scripts/pronunciations_seed.json plus optional jobs/<job>/pronunciations.json.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument("job")
ap.add_argument("--title")
ap.add_argument("--voice", default="am_liam")
ap.add_argument("--theme", choices=["sketchnote"], help="opt-in look, see prompts/scenes.md")
a = ap.parse_args()

jd = ROOT / "jobs" / a.job
nums = sorted(int(re.search(r"(\d+)", p.stem).group(1)) for p in (jd / "parts").glob("scenes_*.json"))
scenes, scripts = [], []
for n in nums:
    scenes += json.loads((jd / f"parts/scenes_{n}.json").read_text(encoding="utf-8"))
    sp = jd / f"parts/script_{n}.md"
    if sp.exists():
        scripts.append(sp.read_text(encoding="utf-8"))

pron = json.loads((ROOT / "scripts/pronunciations_seed.json").read_text(encoding="utf-8"))
extra = jd / "pronunciations.json"
if extra.exists():
    pron.update(json.loads(extra.read_text(encoding="utf-8")))

data = {"title": a.title or scenes[0]["title"], "voice": a.voice, "captions": True}
if a.theme:
    data["theme"] = {"style": a.theme}
data.update({"pronunciations": pron, "scenes": scenes})
(jd / "scenes.json").write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")

count = [0]


def renumber(m):
    count[0] += 1
    return f"## Scene {count[0]}:"


body = "\n".join(re.sub(r"^# .*\n", "", s, count=1) if i else s for i, s in enumerate(scripts))
(jd / "script.md").write_text(re.sub(r"^## Scene \d+:", renumber, body, flags=re.M), encoding="utf-8")
ids = [s["id"] for s in scenes]
words = sum(len(s["narration"].split()) for s in scenes if isinstance(s["narration"], str))
print(f"{len(scenes)} scenes, {len(ids) - len(set(ids))} duplicate ids, {words} narration words (~{words / 2.6 / 60:.0f} min)")
