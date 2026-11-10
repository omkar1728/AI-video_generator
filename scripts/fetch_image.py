#!/usr/bin/env python3
"""Download an image from the internet for an `image` scene.

Usage: python scripts/fetch_image.py <job> <url> <name> "<credit text>"
Saves remotion-app/public/images/<job>/<name>.<ext>; prints the path to use in scenes.json.
Prefer openly licensed sources (Wikimedia Commons, Unsplash, official project logos/docs).
"""
import sys
import urllib.request
from pathlib import Path

MAGIC = {b"\xff\xd8\xff": "jpg", b"\x89PNG": "png", b"RIFF": "webp", b"GIF8": "gif"}


def main() -> None:
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    job, url, name = sys.argv[1:4]
    credit = sys.argv[4] if len(sys.argv) > 4 else ""
    req = urllib.request.Request(url, headers={"User-Agent": "md-to-video/1.0 (local image fetch)"})
    data = urllib.request.urlopen(req, timeout=30).read()
    ext = next((e for m, e in MAGIC.items() if data.startswith(m)), None)
    if ext is None:
        sys.exit("not a jpg/png/webp/gif (maybe an HTML page or SVG); try the direct file URL")
    out = Path(__file__).resolve().parent.parent / "remotion-app/public/images" / job
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{name}.{ext}"
    path.write_bytes(data)
    with open(out / "CREDITS.txt", "a", encoding="utf-8") as f:
        f.write(f"{path.name}\t{url}\t{credit}\n")
    print(f"images/{job}/{path.name}")


if __name__ == "__main__":
    main()
