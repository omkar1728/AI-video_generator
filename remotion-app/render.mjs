// Usage: node render.mjs <scenes.resolved.json> <outDir> [--only id1,id2] [--force] [--parallel N]
// Bundles once, renders one mp4 per scene, skips scenes whose content hash is unchanged.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , scenesPath, outDir, ...rest] = process.argv;
const force = rest.includes("--force");
const parArg = rest.indexOf("--parallel");
const parallel = parArg >= 0 ? Math.max(1, parseInt(rest[parArg + 1])) : 2;
const cores = os.cpus().length;
// total browser tabs ~ 80% of cores, split across parallel scene renders

const onlyArg = rest.indexOf("--only");
const only = onlyArg >= 0 ? rest[onlyArg + 1].split(",") : null;

const data = JSON.parse(fs.readFileSync(scenesPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

const srcHash = crypto.createHash("sha1");
for (const f of fs.readdirSync(path.join(here, "src")).sort()) {
  srcHash.update(fs.readFileSync(path.join(here, "src", f)));
}
const templateHash = srcHash.digest("hex");

const publicDir = path.join(here, "public");
const fileHash = (rel) => {
  if (!rel) return "";
  try { return crypto.createHash("sha1").update(fs.readFileSync(path.join(publicDir, rel))).digest("hex"); }
  catch { return "missing"; }
};

const todo = [];
data.scenes.forEach((scene, index) => {
  if (only && !only.includes(scene.id)) return;
  const hash = crypto.createHash("sha1")
    .update(JSON.stringify({ scene, index, total: data.scenes.length, captions: data.captions !== false, theme: data.theme, templateHash, w: data.width ?? 1920 }))
    .update(fileHash(scene.audio)).update(fileHash(scene.image)).digest("hex");
  const out = path.join(outDir, `${String(index + 1).padStart(2, "0")}-${scene.id}.mp4`);
  const stamp = out + ".hash";
  if (!force && fs.existsSync(out) && fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === hash) {
    console.log("cached", scene.id);
    return;
  }
  todo.push({ scene, index, out, stamp, hash });
});

if (todo.length) {
  console.log(`bundling... (${todo.length} scene(s) to render)`);
  const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts"), publicDir });
  const perRender = data.concurrency ?? Math.max(2, Math.floor((cores * 0.8) / parallel));
  console.log(`rendering ${parallel} scene(s) at a time, ${perRender} tabs each`);
  const queue = [...todo];
  const worker = async () => {
    for (let t; (t = queue.shift()); ) {
    const inputProps = { scene: t.scene, index: t.index, total: data.scenes.length, captions: data.captions !== false, theme: data.theme };
    const comp = await selectComposition({ serveUrl, id: "Scene", inputProps });
    // layouts are authored at 1280x720; render at 1080p (default) via scale
    const outW = data.width ?? 1920;
    const scale = outW / 1280;
    comp.width = 1280;
    comp.height = 720;
    const t0 = Date.now();
    await renderMedia({
      composition: comp, serveUrl, codec: "h264", outputLocation: t.out, inputProps,
      concurrency: perRender, scale, overwrite: true, audioCodec: "aac",
    });
    fs.writeFileSync(t.stamp, t.hash);
    console.log(`rendered ${t.scene.id} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, todo.length) }, worker));
}
