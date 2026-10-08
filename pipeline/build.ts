/**
 * Orchestrator for `npm run build:video -- <video-id>`.
 *
 * Runs the full audio-first pipeline end to end:
 *   1. generate_audio.py   script JSON  → per-scene mp3 + word timings
 *   2. build_manifest.ts   audio        → timing manifest + render props
 *   3. build_captions.ts   word timings → SRT
 *   4. remotion render     props        → MP4
 *   5. remotion still      props        → thumbnail PNG
 *   6. package.ts          assemble     → output/<video-id>/
 *
 * This is a thin sequencer — each step is its own single-purpose script.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const videoId = process.argv[2];

if (!videoId) {
  console.error("Usage: npm run build:video -- <video-id>");
  process.exit(1);
}

const scriptJson = join(REPO, "content", "videos", `${videoId}.json`);
if (!existsSync(scriptJson)) {
  console.error(`✖ No script at ${scriptJson}`);
  process.exit(1);
}

// Prefer the project virtualenv's Python if present (edge-tts lives there).
const venvPython = join(REPO, ".venv", "bin", "python");
const python = existsSync(venvPython) ? venvPython : "python3";

const buildDir = join(REPO, ".build", videoId);
const propsPath = join(buildDir, "props.json");
const entry = join(REPO, "remotion", "src", "index.ts");
const publicDir = join(REPO, "remotion", "public");
const mp4Out = join(buildDir, "video.mp4");
const pngOut = join(buildDir, "thumbnail.png");
const png720 = join(buildDir, "thumbnail-720.png");

function run(label: string, cmd: string, args: string[]) {
  const started = Date.now();
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: REPO });
  console.log(`  ✓ ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

const t0 = Date.now();

run("1/6 narration audio", python, ["pipeline/generate_audio.py", videoId]);
run("2/6 timing manifest", "npx", ["tsx", "pipeline/build_manifest.ts", videoId]);
run("2b/6 script lint", "npx", ["tsx", "pipeline/lint_script.ts", videoId]);
run("3/6 captions (SRT)", "npx", ["tsx", "pipeline/build_captions.ts", videoId]);

run("4/6 render MP4", "npx", [
  "remotion",
  "render",
  entry,
  "Main",
  mp4Out,
  `--props=${propsPath}`,
  `--public-dir=${publicDir}`,
]);

run("5/6 render thumbnail", "npx", [
  "remotion",
  "still",
  entry,
  "Thumbnail",
  pngOut,
  `--props=${propsPath}`,
  `--public-dir=${publicDir}`,
]);

// YouTube's native thumbnail size: downscale the 1080p still to 1280×720.
run("5b/6 thumbnail 1280×720", "ffmpeg", [
  "-y",
  "-i",
  pngOut,
  "-vf",
  "scale=1280:720:flags=lanczos",
  "-update",
  "1",
  "-frames:v",
  "1",
  png720,
]);

run("6/6 package", "npx", ["tsx", "pipeline/package.ts", videoId]);

console.log(
  `\n✅ Done: output/${videoId}/  (total ${((Date.now() - t0) / 1000).toFixed(1)}s)`,
);
