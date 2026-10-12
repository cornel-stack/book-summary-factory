/**
 * Package a SHORT for manual posting (Phase 13). Assembles the vertical mp4 +
 * SRT and writes per-platform metadata the producer pastes by hand:
 *   youtube.txt    — title (≤100 chars, incl. #Shorts) + description
 *   tiktok.txt     — caption + ≤5 niche hashtags
 *   instagram.txt  — caption (fuller) + hashtags
 * Tone differs per platform; the CTA follows the brand's prelaunch flag.
 *
 *   npx tsx pipeline/package_short.ts <short-id>   → output/<short-id>/
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "../remotion/src/schema.js";
import { getBrand, activeCta } from "../config/brands.js";
import { SHORTS_ENDCARD_SECONDS } from "../remotion/src/theme.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function need(p: string, label: string): string {
  if (!existsSync(p)) {
    console.error(`✖ Missing ${label}: ${p}`);
    process.exit(1);
  }
  return p;
}

function hashtags(tags: string[], n: number): string {
  return tags.slice(0, n).map((t) => `#${t.replace(/[^a-z0-9]+/gi, "")}`).join(" ");
}

function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npx tsx pipeline/package_short.ts <short-id>");
    process.exit(1);
  }
  const script = Script.parse(JSON.parse(readFileSync(join(REPO, "content", "videos", `${id}.json`), "utf8")));
  if (script.format !== "short") {
    console.error(`✖ ${id} is not format:"short"`);
    process.exit(1);
  }
  const brand = getBrand(script.brand);
  const buildDir = join(REPO, ".build", id);
  const outDir = join(REPO, "output", id);
  mkdirSync(outDir, { recursive: true });

  const mp4 = need(join(buildDir, "video.mp4"), "rendered short");
  const srt = need(join(buildDir, "captions.srt"), "captions");
  copyFileSync(mp4, join(outDir, `${id}.mp4`));
  copyFileSync(srt, join(outDir, "captions.srt"));

  const cta = `${activeCta(brand)} · ${brand.domain}`;
  const disclaimer = brand.disclaimer ? `\n\n${brand.disclaimer}` : "";
  const shortTags = [...script.tags, brand.id, "shorts"];

  // The end-card is now ~1s (loop/duration > a long outro), so the CTA lives in
  // the CAPTIONS + a PINNED COMMENT instead. Build that pinned block once.
  const pinned = [script.pinned_comment, cta].filter(Boolean).join("\n");
  const pinnedBlock = ["", "— PINNED COMMENT (pin this) —", pinned];

  // YouTube Shorts — title must carry #Shorts and stay ≤100 chars.
  let ytTitle = `${script.title}`.replace(/\s+/g, " ").trim();
  const suffix = " #Shorts";
  if (ytTitle.length + suffix.length > 100) ytTitle = ytTitle.slice(0, 100 - suffix.length - 1).trim() + "…";
  ytTitle += suffix;
  const youtube = [
    ytTitle,
    "",
    script.description,
    "",
    cta,
    hashtags(shortTags, 8),
    disclaimer,
    ...pinnedBlock,
  ].join("\n").trimEnd() + "\n";

  // TikTok — punchy caption + ≤5 niche hashtags.
  const tiktok = [
    `${script.short_hook ?? script.title} 👀`,
    "",
    cta,
    hashtags(shortTags, 5),
    disclaimer,
    ...pinnedBlock,
  ].join("\n").trimEnd() + "\n";

  // Instagram Reels — fuller caption, hashtags at the end.
  const instagram = [
    script.description,
    "",
    cta,
    "",
    hashtags(shortTags, 8),
    disclaimer,
    ...pinnedBlock,
  ].join("\n").trimEnd() + "\n";

  // Loop/duration metadata for the producer.
  let durSec = 0;
  try {
    const mf = JSON.parse(readFileSync(join(buildDir, "manifest.json"), "utf8"));
    durSec = mf.totalDurationInFrames / mf.fps;
  } catch {
    /* manifest optional here */
  }
  const notes = [
    `SHORT NOTES — ${id}`,
    "",
    `Loop replay: ${script.loop ? "YES — final line flows into the opening; replays seamlessly (watch the seam)" : "no"}`,
    `Length: ${durSec ? durSec.toFixed(1) + "s" : "?"}  (target 35–50s${script.max_seconds ? `; override allows up to ${script.max_seconds}s` : ""})`,
    `End-card: ~${SHORTS_ENDCARD_SECONDS}s — brand CTA is in the captions + pinned comment, NOT a long outro`,
    "",
    "PINNED COMMENT (pin this):",
    "  " + pinned.replace(/\n/g, "\n  "),
  ].join("\n") + "\n";

  writeFileSync(join(outDir, "youtube.txt"), youtube);
  writeFileSync(join(outDir, "tiktok.txt"), tiktok);
  writeFileSync(join(outDir, "instagram.txt"), instagram);
  writeFileSync(join(outDir, "short-notes.txt"), notes);

  console.log(`Packaged short → ${outDir}`);
  for (const f of [`${id}.mp4`, "captions.srt", "youtube.txt", "tiktok.txt", "instagram.txt", "short-notes.txt"]) console.log(`  ✓ ${f}`);
}

main();
