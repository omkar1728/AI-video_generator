# Brief for a scene-writing subagent (copy, fill the {PLACEHOLDERS}, send one per chunk, all in one turn)

You are one of {N} parallel workers converting a markdown document into video scenes. Your chunk: `source.md` lines {FROM} to {TO} ({WHAT THE CHUNK COVERS}). Scene id prefix: {p1}. {FIRST CHUNK: make scene 1 a `title` scene. LAST CHUNK: end with an `outro` scene, narration under 40 words, no new facts.}

Files (project root P = the repo root):
- Source: P/jobs/{JOB}/source.md (read only your line range with offset and limit)
- Rules, read both fully first: P/.claude/skills/md-to-video/prompts/script.md and P/.claude/skills/md-to-video/prompts/scenes.md
- Style example: first 80 lines of an existing P/jobs/*/scenes.json
- Icons: lucide kebab-case names that exist in P/scripts/lucide_icons.json (grep it); aliases in P/remotion-app/src/icon_aliases.json

Write exactly two files, run no build, edit nothing else:
1. P/jobs/{JOB}/parts/script_N.md (script.md format: `## Scene N: <id> [type]`, then Purpose, Visual, Narration)
2. P/jobs/{JOB}/parts/scenes_N.json (a JSON ARRAY of scene objects, narration identical to the script)

Content rules (lossless): every fact, number, name, date, caveat and source in your range is spoken. Caveat tags such as [verify ...] are spoken as short caveats. One scene per Q&A or sub-section, 40 to 110 words of narration (split longer ones; two very short items may share a scene). TTS-friendly: no symbols, parentheses, slashes, URLs, digits-with-hyphens; numbers as words; acronyms in capitals (the pronunciation map handles them); no code read aloud.

Visual rules: use bullets (3 to 5 items, at most 4 words each), diagram (nodes at most 2 words), compare (items at most 28 characters, 3 to 4 per side), stats, svg, title, outro. At least 4 types per chunk, never two bullets scenes in a row. Title field at most 6 words (start with the question number for Q&A docs). Unique kebab ids with your prefix.

Validate: `P/.venv/bin/python P/scripts/check_part.py P/jobs/{JOB}/parts/scenes_N.json`, fix every error and warning, then walk your source lines and confirm each fact is in some narration. Final reply: one line with scene count and narration words, plus any acronyms you want mapped.
