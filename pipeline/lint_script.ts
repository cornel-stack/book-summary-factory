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
import { VIDEO } from "../remotion/src/theme.js";
import { gridBox } from "../remotion/src/drawing/layout.js";
import { resolvePhraseTime } from "../remotion/src/drawing/sync.js";

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
    else if (scene.type === "section_title") add(scene.visual.sync);
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
  console.log(deadWindows.length === 0 && collisions === 0 ? "  ✓ lint clean" : "  ⚠ lint found issues (warnings only)");
}

main();
