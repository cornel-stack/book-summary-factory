/**
 * Step 2 of the audio-first pipeline.
 *
 * Input : content/videos/<video-id>.json   (validated against the v1 schema)
 *         .build/<video-id>/words.json      (from generate_audio.py)
 *         remotion/public/assets/<video-id>/<scene-id>.mp3
 * Output: .build/<video-id>/manifest.json   (timing manifest)
 *         .build/<video-id>/props.json      (combined render props: script + manifest)
 *
 * Measures each scene's real audio duration with ffprobe, then lays scenes out
 * sequentially in frames. Durations are NEVER hardcoded.
 *
 * Usage: tsx pipeline/build_manifest.ts <video-id>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Script,
  collectScenePhrases,
  type Manifest,
  type ManifestScene,
  type WordTiming,
} from "../remotion/src/schema.js";
import { VIDEO, VIDEO_VERTICAL, SCENE_PADDING_FRAMES, SHORTS_ENDCARD_SECONDS } from "../remotion/src/theme.js";
import { resolvePhraseTime } from "../remotion/src/drawing/sync.js";
import { getBrand } from "../config/brands.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function ffprobeDurationSec(file: string): number {
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ],
    { encoding: "utf8" },
  );
  const dur = parseFloat(out.trim());
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new Error(`ffprobe returned invalid duration for ${file}: "${out}"`);
  }
  return dur;
}

function main() {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error("Usage: tsx pipeline/build_manifest.ts <video-id>");
    process.exit(1);
  }

  const scriptPath = join(REPO, "content", "videos", `${videoId}.json`);
  const raw = JSON.parse(readFileSync(scriptPath, "utf8"));

  // Fail fast with a readable error before any rendering happens.
  const parsed = Script.safeParse(raw);
  if (!parsed.success) {
    console.error(`\n✖ Script validation failed for ${scriptPath}:\n`);
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  const script = parsed.data;

  const wordsPath = join(REPO, ".build", videoId, "words.json");
  const wordsByScene: Record<string, WordTiming[]> = JSON.parse(
    readFileSync(wordsPath, "utf8"),
  );

  // Fail fast if any narration sync phrase can't be found in its scene's audio.
  const syncErrors: string[] = [];
  for (const scene of script.scenes) {
    const words = wordsByScene[scene.id] ?? [];
    for (const phrase of collectScenePhrases(scene)) {
      if (resolvePhraseTime(words, phrase) === null) {
        syncErrors.push(
          `  • scene "${scene.id}": sync phrase not found in narration → "${phrase}"`,
        );
      }
    }
  }
  if (syncErrors.length > 0) {
    console.error("\n✖ Narration sync validation failed:\n");
    console.error(syncErrors.join("\n"));
    console.error(
      "\nFix the phrase so it matches words actually spoken in that scene's narration.\n",
    );
    process.exit(1);
  }

  const assetsRel = join("assets", videoId);
  let cursor = 0;
  const scenes: ManifestScene[] = script.scenes.map((scene) => {
    const audioRel = join(assetsRel, `${scene.id}.mp3`);
    const audioAbs = join(REPO, "remotion", "public", audioRel);
    const audioDurationSec = ffprobeDurationSec(audioAbs);
    const audioFrames = Math.ceil(audioDurationSec * VIDEO.fps);
    // Phase 14: a SHORT's end-card (cta) is capped to ~1s — a long brand outro
    // bleeds the loop / view-duration metric. The CTA now lives in the captions +
    // pinned comment, so the end-card only needs a brief brand sting.
    const durationInFrames =
      script.format === "short" && scene.type === "cta"
        ? Math.max(1, Math.round(SHORTS_ENDCARD_SECONDS * VIDEO.fps))
        : audioFrames + SCENE_PADDING_FRAMES;

    const startFrame = cursor;
    cursor += durationInFrames;

    return {
      id: scene.id,
      type: scene.type,
      startFrame,
      durationInFrames,
      audioFile: audioRel.split("\\").join("/"), // forward slashes for staticFile
      audioDurationSec: Number(audioDurationSec.toFixed(3)),
      words: wordsByScene[scene.id] ?? [],
    };
  });

  // Shorts render at 9:16; everything else at 16:9. The composition reads these
  // dims via calculateMetadata, so the manifest must carry the right ones.
  const dims = script.format === "short" ? VIDEO_VERTICAL : VIDEO;
  const manifest: Manifest = {
    videoId,
    fps: dims.fps,
    width: dims.width,
    height: dims.height,
    totalDurationInFrames: cursor,
    scenes,
  };

  const outDir = join(REPO, ".build", videoId);
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(
    join(outDir, "props.json"),
    JSON.stringify({ script, manifest }, null, 2),
  );

  const totalSec = (cursor / VIDEO.fps).toFixed(1);
  console.log(
    `Manifest: ${scenes.length} scenes, ${cursor} frames (${totalSec}s @ ${VIDEO.fps}fps)`,
  );

  // Runtime guard (HARD-FAILS). The policy comes from the brand (config/brands.ts),
  // not a global constant: ReadLark long-form ≥ 30 min (default target 32).
  // Shorts must land 20–70s (or within a `target_minutes` window for 2-min
  // socials). Audio is truth — this guards a mis-paced cut before any
  // render minutes are spent.
  {
    const brand = getBrand(script.brand);
    const actualMin = cursor / VIDEO.fps / 60;
    const actualSec = cursor / VIDEO.fps;
    const problems: string[] = [];

    if (script.format === "short") {
      // Two short products share the vertical pipeline: a classic 30–60s clip
      // (no target_minutes) and a longer, vertical-native SOCIAL video (declares
      // target_minutes, e.g. 2.2). When a target is set, enforce ±15% of it with
      // a 90s floor; otherwise keep the 20–70s window.
      if (script.target_minutes != null) {
        const target = script.target_minutes;
        const lo = target * 0.85;
        const hi = target * 1.15;
        if (actualSec < 90) {
          problems.push(`social short is ${actualSec.toFixed(1)}s — below the 90s floor`);
        }
        if (actualMin < lo || actualMin > hi) {
          problems.push(`outside ±15% of target ${target} min (${(lo * 60).toFixed(0)}–${(hi * 60).toFixed(0)}s)`);
        }
      } else if (actualSec < 20 || actualSec > 70) {
        problems.push(`short is ${actualSec.toFixed(1)}s — outside the 20–70s window (aim 30–60s)`);
      }
      if (problems.length) {
        console.error(`\n✖ runtime guard (${brand.id} short): ${problems.join("; ")}.\n  Trim or expand the narration.\n`);
        process.exit(1);
      }
      console.log(`✓ short runtime ${actualSec.toFixed(1)}s (${brand.id})`);
    } else {
      const target = script.target_minutes ?? brand.default_target_minutes;
      const lo = target * 0.9;
      const hi = target * 1.1;
      if (actualMin < brand.min_minutes) {
        problems.push(`below the ${brand.id} long-form minimum of ${brand.min_minutes} min`);
      }
      if (actualMin < lo || actualMin > hi) {
        problems.push(`outside ±10% of target ${target} min (${lo.toFixed(2)}–${hi.toFixed(2)})`);
      }
      if (problems.length > 0) {
        console.error(
          `\n✖ runtime guard (${brand.id}): ${actualMin.toFixed(2)} min is ${problems.join(" and ")}.\n` +
            `  Adjust word count (≈145 words per final minute) or the "rate" field, then rebuild.\n`,
        );
        process.exit(1);
      }
      console.log(
        `✓ runtime ${actualMin.toFixed(2)} min — ${brand.id}, within ±10% of target ${target} min and ≥ ${brand.min_minutes} floor`,
      );
    }
  }
  for (const s of scenes) {
    console.log(
      `  ${s.id.padEnd(18)} start=${String(s.startFrame).padStart(5)}  ` +
        `dur=${String(s.durationInFrames).padStart(4)}f  (${s.audioDurationSec}s audio)`,
    );
  }
}

main();
