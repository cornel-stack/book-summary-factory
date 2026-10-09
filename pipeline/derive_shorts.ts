/**
 * Derive vertical shorts from a long-form script (Phase 13 / amendment: works
 * for BOTH brands). Each principle/section becomes one short:
 *   HOOK (synthesized 1-sentence re-hook) → the section's best story scene
 *   → takeaway card (its application list) → brand end-card.
 *
 * This is a MECHANICAL first pass: it picks and re-frames scenes and writes a
 * fresh hook. Narration from the source scenes is reused verbatim (so every
 * sync phrase still resolves) — the derivation playbook (scripts/derive-shorts.md)
 * calls out where a human should tighten the hook / trim to ≤55s before publish.
 *
 *   npx tsx pipeline/derive_shorts.ts <source-id> [--max N]
 *
 * Writes content/videos/<source-id>-s01.json, -s02.json, … and prints the list.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "../remotion/src/schema.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(REPO, "content", "videos");

// Re-hook formulas (varied by index) for the synthesized 1-sentence hook.
const HOOK_FORMULAS = [
  (t: string) => `Here's the one idea that makes ${t.toLowerCase()} finally click.`,
  (t: string) => `Most people get ${t.toLowerCase()} completely backwards.`,
  (t: string) => `This is why ${t.toLowerCase()} quietly decides everything.`,
  (t: string) => `You've been thinking about ${t.toLowerCase()} the wrong way.`,
  (t: string) => `The fastest way to understand ${t.toLowerCase()}, in sixty seconds.`,
];

function wc(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function main() {
  const srcId = process.argv[2];
  if (!srcId) {
    console.error("Usage: npx tsx pipeline/derive_shorts.ts <source-id> [--max N]");
    process.exit(1);
  }
  const maxArg = process.argv.indexOf("--max");
  const max = maxArg >= 0 ? parseInt(process.argv[maxArg + 1]!, 10) : Infinity;

  const src = Script.parse(JSON.parse(readFileSync(join(DIR, `${srcId}.json`), "utf8")));
  const scenes = src.scenes;

  // Split into principle sections: a section_title role:"principle" + the scenes
  // up to the next section_title / recap_card.
  type Section = { num: number; title: string; memory?: string; body: typeof scenes };
  const sections: Section[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]!;
    if (sc.type === "section_title" && sc.visual.role === "principle") {
      const body: typeof scenes = [];
      for (let j = i + 1; j < scenes.length; j++) {
        const n = scenes[j]!;
        if (n.type === "section_title" || (n.type === "recap_card")) break;
        body.push(n);
      }
      sections.push({ num: sc.visual.number ?? sections.length + 1, title: sc.visual.title, memory: (sc.visual as { memory?: string }).memory, body });
    }
  }

  const written: string[] = [];
  let idx = 0;
  for (const sec of sections) {
    if (idx >= max) break;
    const story = sec.body.find((s) => s.type === "character_scene");
    const takeaway = sec.body.find((s) => s.type === "list_card");
    if (!story) continue; // a section with no visual story isn't short-worthy
    idx++;
    const n = String(idx).padStart(2, "0");
    const id = `${srcId}-s${n}`;
    const hookLine = HOOK_FORMULAS[(idx - 1) % HOOK_FORMULAS.length]!(sec.title);
    const bookName = src.book?.title ?? src.title;

    const outScenes: unknown[] = [
      {
        id: "hook",
        type: "character_scene",
        narration: `${hookLine} It comes straight from ${bookName}.`,
        visual: {
          stage: "plain",
          elements: [
            { kind: "figure", cast: src.thumbnail.cast, at: { col: 3, row: 1, w: 6, h: 5 }, poses: ["presenting"], expression: "happy", label: "watch this" },
          ],
        },
      },
      { ...story, id: "idea" },
    ];
    // Include the takeaway only if the total stays comfortably ≤ ~55s. The
    // end-card adds ~10 words, so cap hook+idea+takeaway at ~120 words (~48s).
    const baseWords = wc(hookLine) + 4 + wc(story.narration);
    if (takeaway && baseWords + wc(takeaway.narration) <= 120) {
      outScenes.push({ ...takeaway, id: "takeaway" });
    }
    outScenes.push({
      id: "end",
      type: "cta",
      narration: "Follow for the full breakdown, and the next idea.",
      visual: { text: "Follow for more", style: "card" },
    });

    const short = {
      id,
      brand: src.brand,
      format: "short",
      title: `${sec.title} — ${bookName}`.slice(0, 95),
      short_hook: sec.title,
      ...(src.book ? { book: src.book } : {}),
      description: `${hookLine} A 60-second idea from ${bookName}.`,
      tags: [...new Set([...(src.tags ?? []).slice(0, 4), sec.title.toLowerCase()])],
      thumbnail: { headline: sec.title.split(/\s+/).slice(0, 5).join(" "), cast: src.thumbnail.cast, pose: "presenting", expression: "happy", props: sec.memory ? [sec.memory] : [] },
      voice: src.voice,
      template: { framing: src.template.framing, hook: "direct" },
      scenes: outScenes,
    };

    // Validate the derived short before writing.
    const parsed = Script.safeParse(short);
    if (!parsed.success) {
      console.error(`✖ derived ${id} is invalid:`);
      for (const iss of parsed.error.issues) console.error(`    ${iss.path.join(".")}: ${iss.message}`);
      continue;
    }
    writeFileSync(join(DIR, `${id}.json`), JSON.stringify(short, null, 2) + "\n");
    written.push(id);
    console.log(`  ✓ ${id}  (${outScenes.length} scenes, ~${baseWords} words)  "${sec.title}"`);
  }

  console.log(`\nDerived ${written.length} shorts from ${srcId}.`);
}

main();
