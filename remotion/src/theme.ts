/**
 * Single source of truth for all visual / timing constants.
 * Nothing in the pipeline or scenes should hardcode these values.
 */
import { FONT_FAMILY } from "./fonts";

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/**
 * Silent padding (in frames) appended after each scene's narration so that
 * one scene's audio doesn't bump straight into the next.
 */
export const SCENE_PADDING_FRAMES = 12; // 0.4s at 30fps

/**
 * Brand color system. Characters use ink fills + a paper-tone head area +
 * flame on exactly one accent item. marker/slate NEVER appear on characters.
 */
export const COLORS = {
  paper: "#FAF6EE", // warm cream canvas — every scene lives on it
  ink: "#1C1A17", // warm near-black — all linework, character fills, text
  inkSoft: "#6B6459", // derived warm grey for secondary text
  // Far (receding) limb tint in profile = ink composited over paper,
  // precomputed as mix(ink, paper, 0.35). Same warm hue family as ink, a clean
  // step lighter so far limbs sit BEHIND the torso — never a desaturated grey.
  inkFar: "#6A6762",
  flame: "#E8501E", // THE accent — accent items, marker circles, emphasis, bursts
  flameSoft: "#F4B59E", // light tint of flame, for background bursts only (never on characters)
  marker: "#FFD95C", // highlighter swipes behind keywords (sparing)
  slate: "#2F6690", // charts only — second data series
} as const;

/**
 * SCENE ART palette (Phase 7) — 5 muted marker tones for backgrounds, staging,
 * and colored props. They sit calmly on paper #FAF6EE next to ink linework, and
 * are desaturated enough that flame (#E8501E) still pops as THE emphasis color.
 * RULE (see template.md): a scene uses at most 2–3 of these + ink; flame is
 * reserved for the hero/emphasis so it never drowns. NEVER on characters.
 */
export const SCENE_PALETTE = {
  leaf: "#7A9E5E", // muted leaf green — grass, trees, growth, "go"
  sky: "#5E8CA8", // muted sky/slate blue — sky, water, windows, calm (kin to slate)
  sand: "#CBA56B", // warm sand/brown — ground, wood, desks, buildings
  sun: "#F2C94C", // soft sun yellow — light, highlights, warmth (kin to marker)
  coral: "#E0896B", // muted coral — soft accent, roofs, warmth (distinct from flame)
} as const;
export type SceneColor = keyof typeof SCENE_PALETTE;

/**
 * CAST_WARDROBE (Phase 8 fusion) — a muted top/garment color per cast member.
 * Cool/jewel-toned so they're clearly distinct from the warm earthy
 * SCENE_PALETTE, no two alike. The flame accent item (tie/hairband/etc.) stays
 * and stays the brightest thing on the character; hands render paper-tone.
 */
export const CAST_WARDROBE = {
  alex: "#3F6F8F", // muted denim blue
  sage: "#6B7A52", // muted olive
  max: "#495A6B", // slate charcoal (a volatile suit)
  maya: "#8E5E78", // muted plum / berry
  pip: "#3E8577", // muted teal (kept cool so it never competes with flame)
} as const;

/** Lighter tints of the palette, for large soft background washes (sky, walls). */
export const SCENE_TINT = {
  leaf: "#C7D7B5",
  sky: "#BBD0DD",
  sand: "#E7D6B8",
  sun: "#FBE5B0",
  coral: "#F2CFC0",
} as const;

/** Font families (resolved webfonts from fonts.ts). */
export const FONTS = {
  heading: FONT_FAMILY.hand, // Caveat
  label: FONT_FAMILY.hand, // Caveat
  body: FONT_FAMILY.body, // Inter
} as const;

export const LAYOUT = {
  safeMargin: 120, // px inset from edges for content
  titleSize: 150,
  subtitleSize: 72,
  labelSize: 52,
  bodySize: 48,
  quoteSize: 84,
  attributionSize: 52,
  lineHeight: 1.25,
} as const;

/**
 * Hand-drawing feel. Speed is in SCENE pixels per second so strokes draw at a
 * consistent visual pace regardless of how big an element is scaled.
 */
export const DRAW = {
  speedPxPerSec: 620, // fast sketching — a stick figure draws in ~1.5–2.5s
  minStrokeFrames: 4, // tiny strokes still take a beat
  maxElementFrames: 60, // cap any single element's whole draw at ~2.0s (progressive pacing)
  liftFrames: 5, // hand lifts + hops between strokes of one drawing
  gapFrames: 7, // hand hop between separate elements
  enterFrames: 9, // hand flies in before the first stroke
  exitFrames: 12, // hand flies out after the last stroke
  labelFadeFrames: 10, // label text fades in after its drawing finishes
  // --- travel (between-stroke hops) ---
  travelMult: 4.5, // hop travel speed as a multiple of draw speed (≥4×)
  hopCapSec: 0.25, // HARD cap on one hop's duration
  longHopFrac: 0.6, // a hop wider than this × frame width lifts out / drops in
} as const;

/** Default content grid used to place drawn elements in a scene. */
export const GRID = {
  cols: 12,
  rows: 6,
} as const;

/**
 * Animation timing + feel (cast rig). All data-tunable from here: the motion
 * module builds Easing.bezier curves from EASING_BEZIER control points.
 */
export const EASING_BEZIER = {
  gesture: [0.22, 1, 0.36, 1], // snappy ease-out for small gestures
  locomotion: [0.45, 0, 0.55, 1], // ease-in-out for walk/body
  settle: [0.34, 1.56, 0.64, 1], // ease-out-back: overshoot + settle
  anticipate: [0.66, -0.5, 0.28, 1.5], // ease-in-out-back: anticipation + overshoot
} as const;

export const MOTION = {
  holdFrames: 40, // how long a pose is held before transitioning
  transFrames: 18, // pose transition length
  followLagFrames: 3, // head / free-arm drag behind the body
  armArcPx: 10, // perpendicular bulge so gestures travel on an arc
  walk: {
    bobPx: 3.2, // vertical body bob (weight)
    leanDeg: 4, // forward torso lean
    armSwing: 9, // arm counter-swing amplitude (local units)
    legSwing: 13,
    headLagFrames: 4, // head bob trails the body
    cycleFrames: 26, // one full stride
  },
  idle: {
    breathePx: 1.2,
    swayDeg: 1.1,
    weightShiftPx: 1.6, // occasional lateral weight shift
    headTurnDeg: 6, // occasional small head turn
    microPeriod: 150, // base frames between micro-actions (seed-jittered)
  },
  staggerFrames: 7, // max seeded offset between characters in a scene
} as const;

/** Caption line-grouping rules (used by build_captions.ts). */
export const CAPTIONS = {
  maxWordsPerLine: 7,
  maxCharsPerLine: 42,
} as const;
