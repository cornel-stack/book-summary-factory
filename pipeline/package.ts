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
import { Script, type Manifest } from "../remotion/src/schema.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function requireFile(path: string, label: string): string {
  if (!existsSync(path)) {
    console.error(`✖ Missing ${label}: ${path}`);
    process.exit(1);
  }
  return path;
}

/** frame → YouTube chapter timestamp ("M:SS" under an hour, "H:MM:SS" over). */
function chapterTime(frame: number, fps: number): string {
  const s = Math.floor(frame / fps);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/**
 * Generate YouTube chapters straight from the render manifest so they stay
 * exactly aligned to what's on screen (and to the SRT) at any length — 5
 * chapters or 50. First chapter is pinned to 0:00 (YouTube requires it). A
 * chapter is emitted for the opening, every part/principle section title, the
 * final recap, and the close. No hand-maintained timestamps.
 */
function buildChapters(script: Script, manifest: Manifest): string {
  const startById = new Map(manifest.scenes.map((m) => [m.id, m.startFrame]));
  const fps = manifest.fps;
  const lines: string[] = [];
  const emit = (frame: number, label: string) =>
    lines.push(`${chapterTime(frame, fps)} ${label}`);

  // YouTube's first chapter must be at 0:00.
  emit(0, "Intro — the one idea");

  for (const scene of script.scenes) {
    const start = startById.get(scene.id);
    if (start === undefined) continue;
    if (scene.type === "section_title" && scene.visual.role === "part") {
      emit(start, `Part ${scene.visual.number ?? "?"} · ${scene.visual.title}`);
    } else if (scene.type === "section_title" && scene.visual.role === "principle") {
      emit(start, `  ${scene.visual.number ?? "?"}) ${scene.visual.title}`);
    } else if (scene.type === "recap_card" && scene.visual.scope === "final") {
      emit(start, "The whole book");
    }
  }
  // The close is the last role-less section title (or the final scene).
  const close = [...script.scenes].reverse().find(
    (s) => s.type === "section_title" && !s.visual.role,
  );
  if (close) {
    const start = startById.get(close.id);
    if (start !== undefined && close.type === "section_title")
      emit(start, close.visual.title);
  }

  // De-dupe any chapter that collides with 0:00 (e.g. a hook that is itself a
  // role-less title) so YouTube doesn't reject a duplicate timestamp.
  const seen = new Set<string>();
  const deduped = lines.filter((l) => {
    const t = l.split(" ")[0]!;
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
  return ["Chapters:", ...deduped].join("\n");
}

function buildDescription(script: Script, manifest: Manifest): string {
  const tagLine = script.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  return [
    script.title,
    "",
    script.description,
    "",
    buildChapters(script, manifest),
    "",
    `Based on "${script.book.title}" by ${script.book.author}` +
      (script.book.year ? ` (${script.book.year})` : ""),
    "",
    tagLine,
    "",
    "— This is an original educational summary for discussion; it is not " +
      "affiliated with or endorsed by the author or publisher. Quotes are the " +
      "author's, used for commentary.",
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
  const manifest: Manifest = JSON.parse(
    readFileSync(join(buildDir, "manifest.json"), "utf8"),
  );
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
  writeFileSync(join(outDir, "description.txt"), buildDescription(script, manifest));

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
