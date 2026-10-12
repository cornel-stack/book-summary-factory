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
import { getBrand, activeCta } from "../config/brands.js";

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

/** ≤n hashtags from tags (YouTube favors a few strong tags, not a wall). */
function hashtagLine(tags: string[], n = 3): string {
  return tags.slice(0, n).map((t) => `#${t.replace(/[^a-z0-9]+/gi, "")}`).join(" ");
}

/**
 * description.txt (Phase 14 — search-first + A/B titles). It is a PRODUCER
 * WORKSHEET: it LEADS with the 3 title variants to paste into YouTube's native
 * A/B test, then (below a separator) the actual description BODY to paste into
 * the description field. The BODY's first two lines are keyword-rich (search
 * shows them): line 1 = the search-led hook (book title verbatim), lines 2-3 =
 * value summary → chapters → ≤3 hashtags → brand/CTA → SRT note → footer.
 */
function buildDescription(script: Script, manifest: Manifest): string {
  const brand = getBrand(script.brand);
  const variants = script.title_variants ?? [script.title];
  const searchLed = variants[0] ?? script.title; // line-1 keyword hook (book title first)
  const cta = `${activeCta(brand)} — ${brand.domain}`;
  const attribution = script.book
    ? `Based on "${script.book.title}" by ${script.book.author}` +
      (script.book.year ? ` (${script.book.year})` : "")
    : null;
  const footer = brand.disclaimer
    ? `— ${brand.disclaimer}`
    : "— This is an original educational summary for discussion; it is not " +
      "affiliated with or endorsed by the author or publisher. Quotes are the " +
      "author's, used for commentary.";
  const srtNote = "📄 Accurate subtitles: upload the included captions.srt in YouTube Studio.";

  const body = [
    searchLed, // line 1 — keyword hook (what search displays)
    "",
    script.description, // 2-3 line value summary
    "",
    buildChapters(script, manifest),
    "",
    hashtagLine(script.tags, 3),
    "",
    cta,
    ...(attribution ? [attribution] : []),
    srtNote,
    "",
    footer,
  ].join("\n");

  if (!script.title_variants) return body + "\n";
  const titlesBlock = [
    "TITLES (paste all 3 into YouTube's A/B test — search / curiosity / benefit):",
    ...script.title_variants.map((t, i) => `  ${i + 1}. ${t}`),
    "",
    "─".repeat(60),
    "DESCRIPTION (paste everything below this line):",
    "",
  ].join("\n");
  return `${titlesBlock}${body}\n`;
}

type CalEntry = { video_id: string; brand?: string; format?: string; publish_date?: string; category?: string; status?: string };

/** Read content/calendar.json defensively (array OR { entries: [...] }). */
function readCalendar(): CalEntry[] {
  try {
    const raw = JSON.parse(readFileSync(join(REPO, "content", "calendar.json"), "utf8"));
    const arr = Array.isArray(raw) ? raw : raw.entries ?? [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Two end-screen link suggestions from calendar history: most-recent
 *  same-category long-form + most-recent long-form overall (the "anchor"). */
function endScreenPicks(videoId: string, category?: string): { label: string; id: string }[] {
  const priors = readCalendar()
    .filter((e) => e.format === "longform" && e.video_id !== videoId && (e.status === "rendered" || e.status === "published"))
    .sort((a, b) => (b.publish_date ?? "").localeCompare(a.publish_date ?? ""));
  const picks: { label: string; id: string }[] = [];
  const sameCat = category ? priors.find((e) => e.category === category) : undefined;
  if (sameCat) picks.push({ label: "most recent same-category", id: sameCat.video_id });
  const anchor = priors.find((e) => e.video_id !== sameCat?.video_id);
  if (anchor) picks.push({ label: "most recent (anchor)", id: anchor.video_id });
  return picks.filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i).slice(0, 2);
}

/** upload-notes.txt — session-time machinery the producer acts on manually. */
function buildUploadNotes(script: Script, videoId: string): string {
  const out: string[] = ["UPLOAD NOTES — " + videoId, ""];
  out.push(`1. PLAYLIST: ${script.category ?? "(set `category` in the script)"}`, "");
  out.push("2. END SCREEN — link these 2 earlier videos:");
  const picks = endScreenPicks(videoId, script.category);
  if (picks.length === 0) {
    out.push("   (no prior rendered videos on the channel yet — use the Subscribe + 'latest upload' end-screen elements instead)");
  } else {
    picks.forEach((p) => out.push(`   • ${p.label}: ${p.id}`));
    if (picks.length < 2) out.push("   (only one prior found — use the Subscribe element for the second slot)");
  }
  out.push("");
  out.push("3. PINNED COMMENT:");
  out.push(`   ${script.pinned_comment ?? "(add a `pinned_comment` engagement question to the script)"}`);
  return out.join("\n") + "\n";
}

/** retention-map.txt — every scene @ timestamp so a retention-graph dip maps to
 *  an exact scene id + TYPE (feeds the monthly tuning ritual). */
function buildRetentionMap(script: Script, manifest: Manifest): string {
  const startById = new Map(manifest.scenes.map((m) => [m.id, m.startFrame]));
  const fps = manifest.fps;
  const lines: string[] = [
    `Retention map — ${script.id}`,
    "Screenshot YouTube's audience-retention graph; map each dip to the scene + TYPE below.",
    "",
    "time    scene                   type              part",
  ];
  let part = 0;
  for (const scene of script.scenes) {
    if (scene.type === "section_title" && scene.visual.role === "part") part = scene.visual.number ?? part + 1;
    const start = startById.get(scene.id);
    if (start === undefined) continue;
    lines.push(
      `${chapterTime(start, fps).padStart(5)}   ${scene.id.padEnd(22)}  ${scene.type.padEnd(16)}  ${part > 0 ? `part ${part}` : "—"}`,
    );
  }
  return lines.join("\n") + "\n";
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

  // Search-first filename: the book title lives in the MP4 name itself.
  const mp4Name = `${videoId}-summary.mp4`;
  copyFileSync(mp4, join(outDir, mp4Name));
  copyFileSync(srt, join(outDir, "captions.srt"));
  copyFileSync(png, join(outDir, "thumbnail.png"));
  copyFileSync(png720, join(outDir, "thumbnail-1280x720.png"));
  writeFileSync(join(outDir, "description.txt"), buildDescription(script, manifest));
  writeFileSync(join(outDir, "upload-notes.txt"), buildUploadNotes(script, videoId));
  writeFileSync(join(outDir, "retention-map.txt"), buildRetentionMap(script, manifest));

  console.log(`Packaged → ${outDir}`);
  for (const f of [
    mp4Name,
    "captions.srt",
    "thumbnail.png",
    "thumbnail-1280x720.png",
    "description.txt",
    "upload-notes.txt",
    "retention-map.txt",
  ]) {
    console.log(`  ✓ ${f}`);
  }
}

main();
