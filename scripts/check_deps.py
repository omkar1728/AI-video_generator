#!/usr/bin/env python3
"""Check pipeline dependencies. Exit 0 if all present, 1 otherwise (prints what is missing).
Run with the system python3 (it does not need the venv): python3 scripts/check_deps.py
If anything is missing, follow README.md (section "Setup")."""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
missing = []


def check(name, ok, hint):
    print(("ok      " if ok else "MISSING ") + name + ("" if ok else f"  -> {hint}"))
    if not ok:
        missing.append(name)


def ver(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return ""


check("python >= 3.10", sys.version_info >= (3, 10), "install Python 3.10+")
node = ver(["node", "--version"]).lstrip("v")
nparts = [int(x) for x in node.split(".")[:2]] if node else [0, 0]
check("node >= 20.19", nparts >= [20, 19], "install Node.js 20.19+ or 22.13+")
check("npm", shutil.which("npm") is not None, "comes with Node.js")
check("ffmpeg", shutil.which("ffmpeg") is not None, "install ffmpeg (apt install ffmpeg)")
check("ffprobe", shutil.which("ffprobe") is not None, "comes with ffmpeg")

py = ROOT / ".venv/bin/python"
check("python venv (.venv)", py.exists(), "README step 2")
if py.exists():
    r = subprocess.run([str(py), "-c", "import kokoro_onnx, soundfile, numpy, onnxruntime"], capture_output=True)
    check("python packages (kokoro-onnx, soundfile, numpy, onnxruntime)", r.returncode == 0, "README step 2: pip install -r requirements.txt")

check("model: models/kokoro-v1.0.int8.onnx", (ROOT / "models/kokoro-v1.0.int8.onnx").stat().st_size > 50_000_000 if (ROOT / "models/kokoro-v1.0.int8.onnx").exists() else False, "README step 3")
check("voices: models/voices-v1.0.bin", (ROOT / "models/voices-v1.0.bin").exists(), "README step 3")
check("remotion node_modules", (ROOT / "remotion-app/node_modules/remotion").exists(), "README step 4: cd remotion-app && npm install")
for pkg in ("@remotion/bundler", "@remotion/renderer", "lucide-react", "prism-react-renderer"):
    check(f"npm package {pkg}", (ROOT / "remotion-app/node_modules" / pkg).exists(), "README step 4")
check("scripts/lucide_icons.json", (ROOT / "scripts/lucide_icons.json").exists(), "README step 5")

print()
if missing:
    print(f"{len(missing)} missing. Read README.md and do the Setup section, then rerun this check.")
    sys.exit(1)
print("all dependencies present")
