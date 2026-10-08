/**
 * Producer's morning command — pull a finished video package onto this machine.
 *
 *   npm run fetch -- atomic-habits     # a specific video
 *   npm run fetch -- --today           # whatever the calendar publishes today (Nairobi)
 *
 * Downloads the GitHub Release tagged <video_id> into
 *   ~/Videos/book-summary-factory/<video_id>/        (override with FETCH_DIR)
 * Uses the gh CLI when available (grabs every release asset); otherwise falls
 * back to plain curl against the stable release download URLs. No secrets — the
 * repo is public and Releases never expire.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Deterministic package file set (see pipeline/package.ts).
const files = (id: string) => [
  `${id}.mp4`,
  "captions.srt",
  "thumbnail.png",
  "thumbnail-1280x720.png",
  "description.txt",
];

function repoSlug(): string {
  if (process.env.FETCH_REPO) return process.env.FETCH_REPO;
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: REPO, encoding: "utf8" }).trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (m) return m[1]!;
  } catch {
    /* fall through */
  }
  return "cornel-stack/book-summary-factory";
}

function todaysVideoId(): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const cal: { video_id: string; publish_date: string }[] = JSON.parse(
    readFileSync(join(REPO, "content", "calendar.json"), "utf8"),
  );
  const entry = cal.find((e) => e.publish_date === today);
  if (!entry) {
    console.error(`✖ nothing scheduled for today (${today}, Nairobi) in content/calendar.json`);
    process.exit(1);
  }
  console.log(`Today (${today}, Nairobi) → ${entry.video_id}`);
  return entry.video_id;
}

function hasGh(): boolean {
  const r = spawnSync("gh", ["--version"], { stdio: "ignore" });
  return r.status === 0;
}

function main() {
  const args = process.argv.slice(2);
  const id = args.includes("--today")
    ? todaysVideoId()
    : args.find((a) => !a.startsWith("--"));
  if (!id) {
    console.error("Usage: npm run fetch -- [video_id|--today]");
    process.exit(1);
  }

  const destRoot = process.env.FETCH_DIR || join(homedir(), "Videos", "book-summary-factory");
  const dest = join(destRoot, id);
  mkdirSync(dest, { recursive: true });
  const slug = repoSlug();

  console.log(`Fetching release "${id}" from ${slug} → ${dest}`);

  if (hasGh()) {
    execFileSync("gh", ["release", "download", id, "--repo", slug, "--dir", dest, "--clobber"], {
      stdio: "inherit",
    });
  } else {
    console.log("(gh CLI not found — using curl against the release URLs)");
    let got = 0;
    for (const f of files(id)) {
      const url = `https://github.com/${slug}/releases/download/${id}/${encodeURIComponent(f)}`;
      try {
        execFileSync("curl", ["-fSL", "--retry", "3", "-o", join(dest, f), url], { stdio: "inherit" });
        got++;
      } catch {
        console.warn(`  ⚠ could not download ${f} (may not exist for this video)`);
      }
    }
    if (got === 0) {
      console.error(`✖ no files downloaded — is the release "${id}" published yet?`);
      process.exit(1);
    }
  }

  console.log(`\n✓ ${id} ready in ${dest}`);
  if (existsSync(join(dest, `${id}.mp4`))) console.log(`  video:       ${join(dest, `${id}.mp4`)}`);
  if (existsSync(join(dest, "description.txt"))) console.log(`  description:  ${join(dest, "description.txt")}`);
}

main();
