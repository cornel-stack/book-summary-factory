/**
 * Step 5 of the pipeline: assemble the final upload package.
 *
 * Input : .build/<video-id>/{video.mp4, thumbnail.png, captions.srt}
 *         content/videos/<video-id>.json
 * Output: output/<video-id>/{<video-id>.mp4, captions.srt, thumbnail.png, description.txt}
 *
 * Usage: tsx pipeline/package.ts <video-id>
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "../remotion/src/schema.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function requireFile(path: string, label: string): string {
  if (!existsSync(path)) {
    console.error(`✖ Missing ${label}: ${path}`);
    process.exit(1);
  }
  return path;
}

function buildDescription(script: Script): string {
  const tagLine = script.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  return [
    script.title,
    "",
    script.description,
    "",
    `Based on "${script.book.title}" by ${script.book.author}` +
      (script.book.year ? ` (${script.book.year})` : ""),
    "",
    tagLine,
    "",
    "— This summary is for educational purposes.",
  ].join("\n");
}

function main() {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error("Usage: tsx pipeline/package.ts <video-id>");
    process.exit(1);
  }

  const script = Script.parse(
    JSON.parse(
      readFileSync(join(REPO, "content", "videos", `${videoId}.json`), "utf8"),
    ),
  );

  const buildDir = join(REPO, ".build", videoId);
  const outDir = join(REPO, "output", videoId);
  mkdirSync(outDir, { recursive: true });

  const mp4 = requireFile(join(buildDir, "video.mp4"), "rendered video");
  const srt = requireFile(join(buildDir, "captions.srt"), "captions");
  const png = requireFile(join(buildDir, "thumbnail.png"), "thumbnail (1080p)");
  const png720 = requireFile(join(buildDir, "thumbnail-720.png"), "thumbnail (720p)");

  copyFileSync(mp4, join(outDir, `${videoId}.mp4`));
  copyFileSync(srt, join(outDir, "captions.srt"));
  copyFileSync(png, join(outDir, "thumbnail.png"));
  copyFileSync(png720, join(outDir, "thumbnail-1280x720.png"));
  writeFileSync(join(outDir, "description.txt"), buildDescription(script));

  console.log(`Packaged → ${outDir}`);
  for (const f of [
    `${videoId}.mp4`,
    "captions.srt",
    "thumbnail.png",
    "thumbnail-1280x720.png",
    "description.txt",
  ]) {
    console.log(`  ✓ ${f}`);
  }
}

main();
