import { z } from "zod";

/**
 * Script JSON schema v1.1 — the single per-video input contract.
 * Shared by the pipeline (fail-fast validation + sync resolution) and the
 * Remotion composition. Human-readable docs live in /content/schema.md.
 *
 * v1.1 adds, backward-compatibly: narration `sync` on drawable elements, grid
 * placement, keyword labels, richer list/recap/stat items, and thumbnail
 * pose/props. (The one non-additive change is character_scene.elements, which
 * went from placeholder strings to structured drawable elements.)
 */

// ---------- shared building blocks ----------

export const STICK_POSES = [
  "standing",
  "sitting",
  "pointing",
  "thinking",
  "celebrating",
  "panicking",
  "walking",
  "shrugging",
  "facepalm",
  "handshake",
  "presenting",
] as const;

export const PROP_KINDS = [
  "door", "desk", "easel", "lightbulb", "moneybag", "book", "arrow", "speech", "house", "bridge",
  // metaphor library (Phase 7)
  "mountain", "path", "staircase", "scale", "hourglass", "clock", "calendar", "trophy", "target",
  "seedling", "sapling", "tree", "brain", "heart", "gears", "ladder", "wall", "gift", "phone",
  "bed", "dumbbell", "shoe", "coffee", "snowball",
] as const;

export const EXPRESSIONS = [
  "neutral",
  "happy",
  "worried",
  "shocked",
  "angry",
  "tired",
  "curious",
] as const;

export const EFFECT_KINDS = [
  "thought_bubble",
  "question_marks",
  "exclamation",
  "idea_flash",
  "sweat_drop",
  "anger_marks",
  "zzz",
  "sparkles",
  "motion_lines",
  "money",
  "shake",
  "nod",
  "headshake",
] as const;

export const ELEMENT_KINDS = ["figure", "crowd", ...PROP_KINDS] as const;

const StickPose = z.enum(STICK_POSES);
const PropKind = z.enum(PROP_KINDS);
const ElementKind = z.enum(ELEMENT_KINDS);
const InkColor = z.enum(["ink", "accent"]).default("ink");

/** A short phrase from the scene's narration; drawing starts when it's spoken. */
const Sync = z.object({ phrase: z.string().min(1) });

/** Grid placement (12 cols × 6 rows over the safe content area). */
const At = z.object({
  col: z.number(),
  row: z.number(),
  w: z.number().positive().default(3),
  h: z.number().positive().default(3),
});

/** An animated effect attached to a character (or a grid cell via `at`). */
export const EffectSpec = z.object({
  kind: z.enum(EFFECT_KINDS),
  at: At.optional(),
  sync: Sync.optional(),
  loop: z.boolean().optional(),
  duration: z.number().positive().optional(),
});

const maxWords = (n: number) => (s: string) =>
  s.trim().split(/\s+/).filter(Boolean).length <= n;
const wordLimit = (n: number) =>
  z.string().min(1).refine(maxWords(n), {
    message: `on-screen text must be ≤ ${n} words (narration carries the rest)`,
  });

// ---------- Per-scene visual payloads ----------

export const SectionTitleVisual = z.object({
  // role in the book-structure skeleton; `number` is the part- or principle-
  // number, `part` the owning part (for a principle). Omit role for plain
  // section titles (hook card, close).
  role: z.enum(["part", "principle"]).optional(),
  number: z.number().int().positive().optional(),
  part: z.number().int().positive().optional(),
  title: z.string().min(1),
  emphasis: z.enum(["underline", "circle"]).default("underline"),
  sync: Sync.optional(),
  // Board memory: a principle's takeaway icon, accumulated along the bottom edge
  // through its part and wiped at the next part boundary.
  memory: z.enum(PROP_KINDS).optional(),
});

/** A brief, non-salesy prompt (subscribe / description link). Max 2 per video. */
export const CtaVisual = z.object({
  text: z.string().min(1),
  style: z.enum(["card", "corner"]).default("card"),
});

/** A single drawable element in a character scene (figure or prop). */
export const CAST_IDS = ["alex", "sage", "max", "maya", "pip"] as const;

/** An expression swing: a bare name, or a name that starts on a spoken phrase. */
const ExpressionCue = z.union([
  z.enum(EXPRESSIONS),
  z.object({ value: z.enum(EXPRESSIONS), sync: Sync.optional() }),
]);

/** A prop gripped in a hand (follows the hand anchor through motion). */
const Holding = z.object({
  prop: PropKind,
  hand: z.enum(["left", "right"]).default("right"),
});

/**
 * How a figure enters:
 * - "draw"  (default) — the hand draws the character in place. Use when the
 *   character is INTRODUCED as a concept.
 * - "walk"  — true off-screen entry: the character strides in from the frame
 *   edge ALREADY ALIVE (side view), then squash-turns to front. No draw-in.
 *   Use when the character ARRIVES as a story beat. Direction = `facing`.
 */
const EnterMode = z.enum(["draw", "walk"]).default("draw");

export const CharacterElement = z.object({
  kind: ElementKind,
  id: z.string().optional(),
  at: At,
  // figure options (v2.0 — the proprietary Cast is the one character system):
  cast: z.enum(CAST_IDS).default("alex"),
  pose: StickPose.optional(),
  poses: z.array(StickPose).optional(),
  expression: z.enum(EXPRESSIONS).optional(),
  expressions: z.array(ExpressionCue).optional(), // sync-driven swings
  view: z.enum(["front", "side"]).optional(), // default: auto (walk/sit → side)
  facing: z.enum(["left", "right"]).default("right"),
  // Seat under a SEATED cast figure. "chair" is the default; "desk" draws a
  // desk and rests the hands on it; "none" opts out (scene supplies the surface).
  seat: z.enum(["chair", "desk", "none"]).default("chair"),
  holding: Holding.optional(),
  enter: EnterMode,
  effects: z.array(EffectSpec).optional(),
  // prop options:
  variant: z.string().optional(), // arrow direction: up | down | curved; door: open
  state: z.string().optional(), // lightbulb: on
  // crowd options (kind:"crowd") — tinted background Open Peeps figures:
  count: z.number().int().min(2).max(8).optional(),
  arrangement: z.enum(["row", "cluster", "queue"]).optional(),
  tint: z.string().optional(),
  // staging: "hero" = hand-drawn (default); "ambient" = washes in (no pen time).
  tier: z.enum(["hero", "ambient"]).default("hero"),
  // reveal: how this element arrives. Default by kind/tier. "draw" = the hand
  // draws it; pop/slide/fade/wash arrive quickly without the pen.
  reveal: z.enum(["draw", "pop", "slide", "fade", "wash"]).optional(),
  // shared:
  scale: z.number().positive().optional(),
  color: InkColor,
  label: wordLimit(6).optional(),
  sync: Sync.optional(),
});

export const STAGE_NAMES = ["plain", "outdoor", "room", "desk-office", "street", "stage-spotlight"] as const;

export const CharacterSceneVisual = z.object({
  title: wordLimit(6).optional(),
  stage: z.enum(STAGE_NAMES).default("plain"),
  elements: z.array(CharacterElement).min(1),
});

export const QuoteCardVisual = z.object({
  quote: z.string().min(1),
  attribution: z.string().min(1),
  // Optional: a cast member "delivers" the quote (hand-drawn, presenting) in
  // the left margin — e.g. Sage as the quoted author.
  cast: z.enum(CAST_IDS).optional(),
});

/** List item: a short label + icon; accepts a bare string for convenience. */
const ListItem = z.union([
  z.string().transform((label) => ({ label, icon: "tick" as const, sync: undefined })),
  z.object({
    label: wordLimit(5),
    icon: z.enum(["tick", "box", "arrow"]).default("tick"),
    sync: Sync.optional(),
  }),
]);

export const ListCardVisual = z.object({
  title: wordLimit(6).optional(),
  items: z.array(ListItem).min(1),
});

export const StatChartVisual = z.object({
  label: z.string().min(1),
  mode: z.enum(["line", "bars"]).default("line"),
  datapoints: z
    .array(
      z.object({
        label: wordLimit(3),
        value: z.number(),
        sync: Sync.optional(),
      }),
    )
    .min(1),
});

const RecapItem = z.union([
  z.string().transform((label) => ({ label, sync: undefined })),
  z.object({ label: wordLimit(4), sync: Sync.optional() }),
]);

export const RecapCardVisual = z.object({
  title: wordLimit(6).optional(),
  scope: z.enum(["mid", "final"]).default("final"), // mid-recap after a part, or the final recap
  items: z.array(RecapItem).min(1),
});

// ---------- Discriminated union of scenes ----------

const SceneBase = {
  id: z.string().min(1),
  narration: z.string().min(1),
};

export const Scene = z.discriminatedUnion("type", [
  z.object({ ...SceneBase, type: z.literal("section_title"), visual: SectionTitleVisual }),
  z.object({ ...SceneBase, type: z.literal("character_scene"), visual: CharacterSceneVisual }),
  z.object({ ...SceneBase, type: z.literal("quote_card"), visual: QuoteCardVisual }),
  z.object({ ...SceneBase, type: z.literal("list_card"), visual: ListCardVisual }),
  z.object({ ...SceneBase, type: z.literal("stat_chart"), visual: StatChartVisual }),
  z.object({ ...SceneBase, type: z.literal("recap_card"), visual: RecapCardVisual }),
  z.object({ ...SceneBase, type: z.literal("cta"), visual: CtaVisual }),
]);

// ---------- Top-level script ----------

export const BRAND_IDS = ["readlark", "percuriam"] as const;
export const FORMATS = ["longform", "short"] as const;

export const Script = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  // Which app brand this content belongs to (brand layer: config/brands.ts).
  brand: z.enum(BRAND_IDS).default("readlark"),
  // longform = 16:9 Main composition; short = 9:16 vertical (30–60s), burned-in captions.
  format: z.enum(FORMATS).default("longform"),
  // The source book (ReadLark). Optional — PerCuriam (law) content has no book.
  book: z
    .object({
      title: z.string().min(1),
      author: z.string().min(1),
      year: z.number().int().optional(),
    })
    .optional(),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  thumbnail: z.object({
    headline: wordLimit(5),
    subline: z.string().optional(),
    cast: z.enum(CAST_IDS).default("alex"),
    pose: StickPose.default("thinking"),
    expression: z.enum(EXPRESSIONS).default("shocked"),
    props: z.array(PropKind).max(2).default([]),
  }),
  voice: z.string().default("en-US-AndrewNeural"),
  // Narration pace: -18% (~150 wpm) is the confirmed channel default (set in
  // generate_audio.py); override here per video if needed.
  rate: z.string().optional(),
  // Target length (minutes) for longform. Optional — the real enforcement lives
  // in build_manifest.ts, which reads the BRAND's min_minutes policy (ReadLark
  // 30, PerCuriam 13) and the brand default target. Shorts ignore this (30–60s).
  target_minutes: z.number().positive().optional(),
  // On-screen hook line for a short (first ~2s claim/question). Longform ignores.
  short_hook: z.string().optional(),
  // Channel template metadata — read by the script generator + future tooling.
  template: z
    .object({
      framing: z.enum(["book-structure", "listicle", "explainer"]).default("book-structure"),
      hook: z.enum(["direct", "cold-open"]).default("direct"),
    })
    .default({ framing: "book-structure", hook: "direct" }),
  scenes: z.array(Scene).min(1),
}).superRefine((s, ctx) => {
  // Long-form structural rules only apply to longform book-structure videos
  // that declare a book (PerCuriam law content uses "explainer" framing and no book).
  if (s.format === "longform" && s.template.framing === "book-structure" && s.book) {
    const lookahead = s.template.hook === "cold-open" ? 2 : 1;
    const n = s.scenes.slice(0, lookahead).map((sc) => sc.narration).join(" ").toLowerCase();
    const titleWords = s.book.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const authorLast = s.book.author.toLowerCase().split(/\s+/).pop() ?? "";
    const named = titleWords.some((w) => n.includes(w)) || (authorLast.length > 2 && n.includes(authorLast));
    if (!named) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `book-structure framing requires the book title or author named in the first ${lookahead} scene(s)' narration`,
        path: ["scenes", 0, "narration"],
      });
    }
    // Every "part" title must be followed by a mid-recap before the next part.
    const marks = s.scenes.map((sc, i) => ({ i, sc }));
    const partIdx = marks.filter((m) => m.sc.type === "section_title" && (m.sc.visual as { role?: string }).role === "part").map((m) => m.i);
    partIdx.forEach((start, k) => {
      const end = k + 1 < partIdx.length ? partIdx[k + 1]! : s.scenes.length;
      const hasMid = s.scenes.slice(start + 1, end).some((sc) => sc.type === "recap_card" && (sc.visual as { scope?: string }).scope === "mid");
      if (!hasMid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `part at scene ${start} ("${(s.scenes[start]!.visual as { title?: string }).title}") must be followed by a recap_card scope:"mid" before the next part`,
          path: ["scenes", start],
        });
      }
    });
  }
  // At most 2 CTA scenes per video.
  const ctaCount = s.scenes.filter((sc) => sc.type === "cta").length;
  if (ctaCount > 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `at most 2 cta scenes per video (found ${ctaCount})`, path: ["scenes"] });
  }
});

export type Script = z.infer<typeof Script>;
export type Scene = z.infer<typeof Scene>;
export type SceneType = Scene["type"];
export type CharacterElement = z.infer<typeof CharacterElement>;

/**
 * Every narration sync phrase referenced by a scene, for build-time validation.
 */
export function collectScenePhrases(scene: Scene): string[] {
  const out: string[] = [];
  const push = (p?: { phrase: string }) => {
    if (p) out.push(p.phrase);
  };
  switch (scene.type) {
    case "section_title":
      push(scene.visual.sync);
      break;
    case "character_scene":
      scene.visual.elements.forEach((e) => {
        push(e.sync);
        e.effects?.forEach((fx) => push(fx.sync));
        e.expressions?.forEach((ex) => {
          if (typeof ex !== "string") push(ex.sync);
        });
      });
      break;
    case "list_card":
      scene.visual.items.forEach((i) => push(i.sync));
      break;
    case "recap_card":
      scene.visual.items.forEach((i) => push(i.sync));
      break;
    case "stat_chart":
      scene.visual.datapoints.forEach((d) => push(d.sync));
      break;
    case "quote_card":
    case "cta":
      break;
  }
  return out;
}

// ---------- Timing manifest (produced by build_manifest.ts) ----------

export const WordTiming = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});
export type WordTiming = z.infer<typeof WordTiming>;

export const ManifestScene = z.object({
  id: z.string(),
  type: z.string(),
  startFrame: z.number().int(),
  durationInFrames: z.number().int(),
  audioFile: z.string(),
  audioDurationSec: z.number(),
  words: z.array(WordTiming),
});
export type ManifestScene = z.infer<typeof ManifestScene>;

export const Manifest = z.object({
  videoId: z.string(),
  fps: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  totalDurationInFrames: z.number().int(),
  scenes: z.array(ManifestScene),
});
export type Manifest = z.infer<typeof Manifest>;

export const RenderProps = z.object({
  script: Script,
  manifest: Manifest,
});
export type RenderProps = z.infer<typeof RenderProps>;
