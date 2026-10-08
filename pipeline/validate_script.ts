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
import { Script, collectScenePhrases } from "../remotion/src/schema.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(REPO, "content", "videos");
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
  if (bad) return 1;
  console.log(`✓ ${id}: ${parsed.data.scenes.length} scenes, ${words} words, all sync phrases present`);
  return 0;
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
