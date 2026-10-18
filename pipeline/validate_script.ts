/**
 * Fast, audio-free script validation for CI (the lint-only workflow). Checks
 * every script in content/videos/ (or one id): Zod schema + that every sync
 * phrase actually appears (as consecutive words) in its scene's narration.
 * FAILS (exit 1) on any problem — the full density lint (which needs audio
 * timing) runs later in the render workflow.
 *
 * Usage: tsx pipeline/validate_script.ts [<video-id>]
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, collectScenePhrases, subscribePromptIndices } from "../remotion/src/schema.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(REPO, "content", "videos");
// Published before the subscriber-growth pass (Oct 2026) — exempt from the
// 3-prompt rule so CI lint keeps passing on the back catalogue.
const LEGACY_NO_SUBSCRIBE = new Set(["atomic-habits", "the-psychology-of-money", "sample-video"]);
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).join(" ");

function validate(id: string): number {
  const raw = JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8"));
  const parsed = Script.safeParse(raw);
  if (!parsed.success) {
    console.error(`✖ ${id}: schema invalid`);
    for (const i of parsed.error.issues) console.error(`    ${i.path.join(".") || "(root)"}: ${i.message}`);
    return 1;
  }
  let bad = 0;
  let words = 0;
  for (const scene of parsed.data.scenes) {
    const n = norm(scene.narration);
    words += scene.narration.trim().split(/\s+/).length;
    for (const ph of collectScenePhrases(scene)) {
      if (!n.includes(norm(ph))) {
        console.error(`✖ ${id} [${scene.id}]: sync phrase not in narration → "${ph}"`);
        bad++;
      }
    }
  }
  bad += checkSubscribePrompts(id, parsed.data);
  if (bad) return 1;
  console.log(`✓ ${id}: ${parsed.data.scenes.length} scenes, ${words} words, all sync phrases present`);
  return 0;
}

/**
 * Longform subscriber-growth rule: ≥3 subscribe prompts — START (after the
 * first value lands, ~2–15% in), MID (30–70%), END (final ~15%). Position is
 * by narration words (audio-free); lint_script re-checks it in real seconds.
 */
function checkSubscribePrompts(id: string, script: Script): number {
  if (script.format !== "longform" || LEGACY_NO_SUBSCRIBE.has(id)) return 0;
  const idx = subscribePromptIndices(script);
  const wc = script.scenes.map((sc) => sc.narration.trim().split(/\s+/).length);
  const total = wc.reduce((a, b) => a + b, 0);
  const posOf = (i: number) => wc.slice(0, i).reduce((a, b) => a + b, 0) / total;
  const pos = idx.map(posOf);
  const problems: string[] = [];
  if (idx.length < 3) problems.push(`only ${idx.length} subscribe prompt(s) — need ≥3 (start, mid, end)`);
  if (!pos.some((p) => p >= 0.02 && p <= 0.15)) problems.push("no START prompt between 2% and 15% of the narration (after the first idea pays off)");
  if (!pos.some((p) => p >= 0.3 && p <= 0.7)) problems.push("no MID prompt between 30% and 70%");
  if (!pos.some((p) => p >= 0.85)) problems.push("no END prompt in the final 15%");
  if (pos.some((p) => p < 0.02)) problems.push("a subscribe prompt sits in the hook — never ask before delivering value");
  for (const i of idx) {
    const sc = script.scenes[i]!;
    if (!/subscrib/i.test(sc.narration)) problems.push(`[${sc.id}] subscribe prompt narration never says "subscribe"`);
  }
  for (const p of problems) console.error(`✖ ${id}: ${p}`);
  return problems.length;
}

const arg = process.argv[2];
const ids = arg ? [arg] : readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
let fail = 0;
for (const id of ids) fail |= validate(id);
if (fail) {
  console.error("\n✖ script validation failed");
  process.exit(1);
}
console.log("\n✓ all scripts valid");
