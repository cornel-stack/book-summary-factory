/**
 * Build the full narration audio track from the per-scene mp3s + the manifest
 * timing (each scene's audio placed at its startFrame, silence between). Used by
 * the chunked-render stitch step: video chunks render MUTED (no audio seams at
 * chunk boundaries), then this single track is muxed over the concatenated
 * video. Deterministic + locally runnable.
 *
 * Usage: tsx pipeline/build_audio_track.ts <video-id>   → .build/<id>/audio.m4a
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VIDEO } from "../remotion/src/theme.js";
import type { Manifest } from "../remotion/src/schema.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const id = process.argv[2];
  if (!id) process.exit(1);
  const manifest: Manifest = JSON.parse(readFileSync(join(REPO, ".build", id, "manifest.json"), "utf8"));
  const assetsDir = join(REPO, "remotion", "public", "assets", id);
  const totalSec = manifest.totalDurationInFrames / VIDEO.fps;

  // base silent bed for the full duration, then overlay each scene mp3 at its offset
  const args: string[] = ["-y", "-f", "lavfi", "-t", totalSec.toFixed(3), "-i", "anullsrc=r=44100:cl=stereo"];
  manifest.scenes.forEach((s) => args.push("-i", join(assetsDir, `${s.id}.mp3`)));
  const delays = manifest.scenes
    .map((s, i) => `[${i + 1}]adelay=${Math.round((s.startFrame / VIDEO.fps) * 1000)}:all=1[a${i}]`)
    .join(";");
  const mix = `${delays};[0]${manifest.scenes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${manifest.scenes.length + 1}:normalize=0[out]`;
  const out = join(REPO, ".build", id, "audio.m4a");
  args.push("-filter_complex", mix, "-map", "[out]", "-c:a", "aac", "-b:a", "192k", "-t", totalSec.toFixed(3), out);

  execFileSync("ffmpeg", args, { stdio: "inherit" });
  console.log(`✓ audio track → ${out} (${totalSec.toFixed(1)}s, ${manifest.scenes.length} scenes)`);
}

main();
