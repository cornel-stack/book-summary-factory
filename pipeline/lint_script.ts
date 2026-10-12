/**
 * Build-time script lint (Phase 9) — CI-visible (stdout). Runs after the
 * manifest. Two checks, both WARN (never fail — audio is truth):
 *   1. DENSITY — every ~10s of the video should have SOMETHING new on screen
 *      (a reveal/effect/pose-swing/data-point/list-item). Flags dead windows.
 *   2. COLLISION — hero element boxes in a character_scene must not overlap >30%
 *      (moved here from the Studio console).
 *
 * Usage: tsx pipeline/lint_script.ts <video-id>
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, type Manifest } from "../remotion/src/schema.js";
import { VIDEO, SHORTS_DURATION } from "../remotion/src/theme.js";
import { gridBox } from "../remotion/src/drawing/layout.js";
import { resolvePhraseTime } from "../remotion/src/drawing/sync.js";

/** Significant (len>3) lowercased words of the book title, for search checks. */
function bookTitleWords(title: string): string[] {
  return title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
}
function containsBookTitle(haystack: string, title: string): boolean {
  const h = haystack.toLowerCase();
  return bookTitleWords(title).some((w) => h.includes(w));
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DENSITY_WINDOW = 8; // seconds — progressive-pacing dwell cap (Phase 10)
const SWING = (40 + 18) / 30; // pose hold+transition ≈ one "new thing" cadence
const fps = VIDEO.fps;

function main() {
  const id = process.argv[2];
  if (!id) process.exit(1);
  const script = Script.parse(JSON.parse(readFileSync(join(REPO, "content", "videos", `${id}.json`), "utf8")));
  const manifest: Manifest = JSON.parse(readFileSync(join(REPO, ".build", id, "manifest.json"), "utf8"));
  const mById = new Map(manifest.scenes.map((m) => [m.id, m]));

  // Collect visual-change timestamps (absolute seconds).
  const events: number[] = [];
  let collisions = 0;
  for (const scene of script.scenes) {
    const m = mById.get(scene.id);
    if (!m) continue;
    const t0 = m.startFrame / fps;
    const dur = m.durationInFrames / fps;
    events.push(t0); // a new scene is itself a visual change
    events.push(t0 + Math.min(dur, 2.5)); // the hand's draw-in is ~new for ~2s
    if (scene.type === "character_scene") {
      // multi-pose figures do something NEW on each pose swing (not idle breathing)
      let maxPoses = 1;
      for (const el of scene.visual.elements) if (el.kind === "figure") maxPoses = Math.max(maxPoses, (el.poses?.length ?? 1) + (el.enter === "walk" ? 1 : 0));
      for (let k = 1; k < maxPoses; k++) { const t = t0 + 2.5 + k * SWING; if (t < t0 + dur - 1) events.push(t); }
    }
    const at = (phrase?: { phrase: string }) => {
      if (!phrase) return null;
      const s = resolvePhraseTime(m.words, phrase.phrase);
      return s === null ? null : t0 + s;
    };
    const add = (p?: { phrase: string }) => {
      const e = at(p);
      if (e !== null) events.push(e);
    };
    if (scene.type === "character_scene") {
      const heroBoxes: { key: string; b: { x: number; y: number; w: number; h: number } }[] = [];
      scene.visual.elements.forEach((el, i) => {
        add(el.sync);
        el.effects?.forEach((fx) => add(fx.sync));
        el.expressions?.forEach((ex) => typeof ex !== "string" && add(ex.sync));
        // hero = figure or a draw-reveal prop (not crowd/ambient)
        const isHero = el.kind === "figure" || (el.kind !== "crowd" && (el.reveal ?? (el.tier === "ambient" ? "wash" : "draw")) === "draw");
        if (isHero) heroBoxes.push({ key: el.id ?? `${el.kind}-${i}`, b: gridBox(el.at) });
      });
      for (let a = 0; a < heroBoxes.length; a++)
        for (let b = a + 1; b < heroBoxes.length; b++) {
          const A = heroBoxes[a]!.b, B = heroBoxes[b]!.b;
          const ox = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x));
          const oy = Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
          const minA = Math.min(A.w * A.h, B.w * B.h);
          if (minA > 0 && ox * oy > minA * 0.3) {
            console.warn(`  ⚠ collision [${scene.id}] "${heroBoxes[a]!.key}" × "${heroBoxes[b]!.key}" overlap ${((ox * oy) / minA * 100).toFixed(0)}%`);
            collisions++;
          }
        }
    } else if (scene.type === "stat_chart") scene.visual.datapoints.forEach((d) => add(d.sync));
    else if (scene.type === "list_card" || scene.type === "recap_card") scene.visual.items.forEach((it) => add((it as { sync?: { phrase: string } }).sync));
    else if (scene.type === "compare") [...scene.visual.left.items, ...scene.visual.right.items].forEach((it) => add((it as { sync?: { phrase: string } }).sync));
    else if (scene.type === "table") scene.visual.rows.forEach((r) => add((r as { sync?: { phrase: string } }).sync));
    else if (scene.type === "section_title") add(scene.visual.sync);
  }

  // ── Phase 14 hard checks (FAIL → exit 1) + extra warnings ──────────────────
  const errors: string[] = [];
  const warns: string[] = [];
  const first = script.scenes[0];
  const isLongBook = script.format === "longform" && script.template.framing === "book-structure" && !!script.book;

  if (isLongBook && script.book) {
    // (B) search-first: the book title must lead title_variants[0] AND appear in
    // the description (packager puts [0] on description line 1).
    const v = script.title_variants;
    if (!v || v.length !== 3) errors.push("missing title_variants (exactly 3 required for longform A/B testing)");
    else if (!containsBookTitle(v[0]!, script.book.title)) errors.push(`title_variants[0] (search-led) must contain the book title → "${v[0]}"`);
    if (!containsBookTitle(script.description, script.book.title)) errors.push("description must name the book title (it is the search-visible first line)");
  }
  if (script.format === "longform") {
    // (F) hook: first-scene visual change within 3s + core promise within 15s.
    const fm = first ? mById.get(first.id) : undefined;
    if (!fm) warns.push("first scene has no manifest entry (cannot verify the 3s hook)");
    else if (Math.min(fm.durationInFrames / fps, 2.5) > 3) warns.push("first-scene visual beat later than 3s");
    if (script.promise) {
      let promiseAt: number | null = null;
      for (const scene of script.scenes) {
        const m = mById.get(scene.id);
        if (!m) continue;
        const t0 = m.startFrame / fps;
        if (t0 > 15) break;
        const s = resolvePhraseTime(m.words, script.promise);
        if (s !== null) { promiseAt = t0 + s; break; }
      }
      if (promiseAt === null || promiseAt > 15)
        errors.push(`core promise "${script.promise}" ${promiseAt === null ? "not spoken" : `stated at ${promiseAt.toFixed(1)}s`} within the first 15s`);
    } else {
      warns.push("no `promise` tagged — cannot verify the 15s core-promise hook (tag the promise sentence)");
    }
  }
  if (script.format === "short") {
    // (D) duration band + 2s on-screen hook claim.
    const shortTotal = manifest.totalDurationInFrames / fps;
    const cap = script.max_seconds ?? SHORTS_DURATION.warn;
    if (shortTotal > cap)
      warns.push(`short is ${shortTotal.toFixed(1)}s (> ${cap}s${script.max_seconds ? " override" : " — target 35–50s; set max_seconds for a deliberate long short"})`);
    if (!script.short_hook) warns.push("no short_hook — the 2s hook needs an on-screen claim in the first ~60 frames");
  }

  // ── Phase 16 — visual richness nudges (warnings) ───────────────────────────
  const ENUM = /\b(two|three|four|five|six|seven|eight|nine|ten)\b[\s\S]{0,40}?\b(ideas?|steps?|laws?|rules?|reasons?|skills?|ways?|things?|types?|kinds?|lessons?|parts?|traits?|habits?|questions?|principles?|levels?|stages?|pillars?)\b/i;
  const SHOWN = new Set(["list_card", "compare", "recap_card", "stat_chart", "table"]);
  for (const scene of script.scenes) {
    if (scene.type === "character_scene") {
      const heroes = scene.visual.elements.filter(
        (el) => el.kind === "figure" || (el.kind !== "crowd" && (el.reveal ?? (el.tier === "ambient" ? "wash" : "draw")) === "draw"),
      );
      if (heroes.length <= 1) warns.push(`lone graphic in "${scene.id}" — add a metaphor/data prop or a 2nd figure (never a lone figure)`);
    }
    const em = scene.narration.match(ENUM);
    if (em && !SHOWN.has(scene.type)) warns.push(`"${scene.id}" narrates a list ("${em[0].slice(0, 32)}…") but doesn't show it — use list_card / compare / stat_chart`);
  }

  events.sort((a, b) => a - b);
  const total = manifest.totalDurationInFrames / fps;
  const deadWindows: string[] = [];
  for (let i = 1; i < events.length; i++) {
    const gap = events[i]! - events[i - 1]!;
    if (gap > DENSITY_WINDOW) deadWindows.push(`${events[i - 1]!.toFixed(1)}s→${events[i]!.toFixed(1)}s (${gap.toFixed(1)}s)`);
  }
  // tail gap (last event → end)
  if (events.length && total - events[events.length - 1]! > DENSITY_WINDOW)
    deadWindows.push(`${events[events.length - 1]!.toFixed(1)}s→${total.toFixed(1)}s (end)`);

  console.log(`\nLint ${id}: ${events.length} visual-change events over ${total.toFixed(1)}s`);
  if (deadWindows.length) console.warn(`  ⚠ DENSITY: ${deadWindows.length} window(s) > ${DENSITY_WINDOW}s with nothing new:\n    ${deadWindows.join("\n    ")}`);
  else console.log(`  ✓ density OK (no >${DENSITY_WINDOW}s dead windows)`);
  if (!collisions) console.log("  ✓ no hero-box collisions");
  for (const w of warns) console.warn(`  ⚠ ${w}`);
  for (const e of errors) console.error(`  ✖ ${e}`);
  const clean = deadWindows.length === 0 && collisions === 0 && warns.length === 0 && errors.length === 0;
  console.log(
    clean
      ? "  ✓ lint clean"
      : errors.length
        ? `  ✖ lint FAILED — ${errors.length} hard error(s)`
        : "  ⚠ lint found warnings (non-blocking)",
  );
  if (errors.length) process.exit(1);
}

main();
