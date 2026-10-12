/**
 * The autonomous daily driver. Given a book <slug> whose longform script ALREADY
 * exists at content/videos/<slug>.json (written by Claude Code via /make-today),
 * it does everything else hands-off:
 *
 *   derive 3 shorts → validate → schedule calendar → commit + push →
 *   trigger CI (render.yml + render-shorts.yml into one content-<date> bundle) →
 *   wait for both runs → download the finished videos into output/<date>/ →
 *   mark the book done in the xlsx + launch-plan.json.
 *
 *   npm run day -- <slug>          full run (blocks ~20-30 min on CI)
 *   npm run day -- <slug> --dry    stop before triggering CI (local check)
 *
 * TTS in CI auto-falls back edge → Azure → Kokoro, so narration never fails.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENV_PY = join(REPO, ".venv", "bin", "python");
const PY = existsSync(VENV_PY) ? VENV_PY : "python3";

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const slug: string = argv.find((a) => !a.startsWith("--")) ?? "";
if (!slug) {
  console.error("Usage: npm run day -- <slug> [--dry]");
  process.exit(1);
}

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const run = (cmd: string, args: string[], env?: NodeJS.ProcessEnv) =>
  execFileSync(cmd, args, { cwd: REPO, stdio: "inherit", env: env ?? process.env });
const cap = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, { cwd: REPO, encoding: "utf8" }).trim();
const step = (n: string) => console.log(`\n▶ ${n}`);

function main() {
  const scriptPath = join(REPO, "content", "videos", `${slug}.json`);
  if (!existsSync(scriptPath)) {
    console.error(`✖ ${scriptPath} not found — generate the longform script first (/make-today).`);
    process.exit(1);
  }
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const tag = `content-${date}`;
  const branch = cap("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  console.log(`Day run: ${slug}  →  bundle ${tag}  (branch ${branch})`);

  // 1. derive 3 shorts
  step("1/8 derive 3 shorts");
  run("npx", ["tsx", "pipeline/derive_shorts.ts", slug, "--max", "3"]);
  const shortIds = readdirSync(join(REPO, "content", "videos"))
    .filter((f) => new RegExp(`^${slug}-s\\d+\\.json$`).test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort()
    .slice(0, 3);
  if (shortIds.length === 0) {
    console.error("✖ derive_shorts produced no shorts (does the longform have principle sections?)");
    process.exit(1);
  }
  console.log(`  shorts: ${shortIds.join(", ")}`);

  // 2. validate (schema + sync phrases) — longform + shorts
  step("2/8 validate");
  for (const id of [slug, ...shortIds]) run("npx", ["tsx", "pipeline/validate_script.ts", id]);

  // 3. schedule the calendar (today) + stamp category from the launch plan
  step("3/8 schedule calendar");
  run("npx", ["tsx", "pipeline/fill_calendar.ts", "--start", date, "--brand", "readlark", "--format", "longform", "--ids", slug]);
  run("npx", ["tsx", "pipeline/fill_calendar.ts", "--start", date, "--brand", "readlark", "--format", "short", "--per-day", "3", "--ids", shortIds.join(",")]);
  stampCategory([slug, ...shortIds]);

  if (dry) {
    console.log("\n✓ dry run complete — local only (no commit/push/CI). Shorts, validation, and calendar are ready.");
    return;
  }

  // 4. commit + push
  step("4/8 commit + push");
  run("git", ["add", "-A"]);
  if (cap("git", ["status", "--porcelain"]).length) run("git", ["commit", "-q", "-m", `day: ${slug} + ${shortIds.length} shorts (${date})`]);
  else console.log("  (nothing to commit)");
  run("git", ["push"]);

  // 5. trigger CI into one bundle Release
  step("5/8 trigger CI");
  run("gh", ["workflow", "run", "render.yml", "--ref", branch, "-f", `video_id=${slug}`, "-f", `release_tag=${tag}`]);
  run("gh", ["workflow", "run", "render-shorts.yml", "--ref", branch, "-f", `ids=${shortIds.join(",")}`, "-f", `release_tag=${tag}`]);
  sleep(12000);
  const longRun = latestRun("render.yml", branch);
  const shortRun = latestRun("render-shorts.yml", branch);
  console.log(`  render.yml run ${longRun}, render-shorts.yml run ${shortRun}`);

  // 6. wait for both (exit non-zero on failure)
  step("6/8 wait for CI (20-30 min for a 30-min video)");
  if (shortRun) run("gh", ["run", "watch", shortRun, "--exit-status"]);
  if (longRun) run("gh", ["run", "watch", longRun, "--exit-status"]);

  // 7. download the finished bundle into output/<date>/
  step("7/8 download → output/" + date);
  run("npx", ["tsx", "pipeline/fetch_release.ts", "--today"], { ...process.env, FETCH_DIR: join(REPO, "output", date) });

  // 8. mark the book produced (xlsx + launch-plan)
  step("8/8 mark done");
  run(PY, ["pipeline/mark_book_done.py", slug, date]);

  console.log(`\n✅ ${slug}: longform + ${shortIds.length} shorts rendered → output/${date}/  (marked done)`);
}

/** Latest run id for a workflow on a branch (after we just triggered it). */
function latestRun(workflow: string, branch: string): string | null {
  for (let i = 0; i < 6; i++) {
    try {
      const out = cap("gh", ["run", "list", "--workflow", workflow, "--branch", branch, "--limit", "1", "--json", "databaseId"]);
      const arr = JSON.parse(out) as { databaseId: number }[];
      if (arr[0]) return String(arr[0].databaseId);
    } catch {
      /* retry */
    }
    sleep(5000);
  }
  return null;
}

/** Stamp each calendar entry's category from the launch plan (endScreenPicks). */
function stampCategory(ids: string[]) {
  const calPath = join(REPO, "content", "calendar.json");
  const planPath = join(REPO, "content", "launch-plan.json");
  if (!existsSync(calPath) || !existsSync(planPath)) return;
  const cal = JSON.parse(readFileSync(calPath, "utf8")) as { video_id: string; category?: string }[];
  const plan = JSON.parse(readFileSync(planPath, "utf8")) as { slug: string; category: string }[];
  const cat = plan.find((b) => b.slug === slug)?.category;
  if (!cat) return;
  for (const e of cal) if (ids.includes(e.video_id)) e.category = cat;
  writeFileSync(calPath, JSON.stringify(cal, null, 2) + "\n");
}

main();
