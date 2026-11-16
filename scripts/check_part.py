#!/usr/bin/env python3
"""Validate one partial scenes array written by a parallel scene-writing subagent.

Usage: .venv/bin/python scripts/check_part.py jobs/<job>/parts/scenes_N.json
Runs build.validate (required fields, types, icons) and warns on narration length, long titles, adjacent bullets.
"""
import collections
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

path = Path(sys.argv[1])
scenes = json.loads(path.read_text(encoding="utf-8"))
assert isinstance(scenes, list), "file must be a JSON array of scene objects"
types = collections.Counter(s["type"] for s in scenes)
prev = None
for s in scenes:
    if s["type"] == "bullets" and prev == "bullets":
        print(f"warn: two bullets scenes in a row at {s['id']}")
    prev = s["type"]
    n = len(s["narration"].split()) if isinstance(s["narration"], str) else 0
    if n > 115 or n < 25:
        print(f"warn: {s['id']} narration {n} words")
    if len(s["title"].split()) > 6:
        print(f"warn: {s['id']} title longer than 6 words")
build.validate({"scenes": scenes})
total = sum(len(s["narration"].split()) for s in scenes)
print(f"OK: {len(scenes)} scenes, {total} narration words, types={dict(types)}")
