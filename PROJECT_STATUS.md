# Project status — Book Summary Video Factory

_Last updated: Phase 9 — wardrobe + crowd tier + rich density (Phase 8 travel fix live)._

A data-driven pipeline that turns **one script JSON** into a full YouTube
upload package (1080p MP4, SRT, thumbnail, description). Audio-first timing;
whiteboard style with a real photographed drawing hand; a proprietary flat-
vector character cast.

> Detailed engineering gotchas live in the session memory at
> `~/.claude/projects/-home-cornel-Projects-Book-Summary-Prod/memory/`
> (`video-factory-gotchas.md`). This file is the high-level "where we are".

---

## What works today (shippable)

**The pipeline (Phases 1–3) — DONE and verified end to end.**
- `npm run build:video -- <video-id>` → `output/<video-id>/` with
  `<id>.mp4` (1920×1080/30fps), `captions.srt`, `thumbnail.png`,
  `thumbnail-1280x720.png`, `description.txt`.
- Steps: `generate_audio.py` (edge-tts → mp3 + word timings) → `build_manifest.ts`
  (ffprobe durations + **sync-phrase validation, fails fast**) → `build_captions.ts`
  (SRT) → Remotion render (MP4) → thumbnail still → `package.ts`.
- **Photographed drawing hand**: two matted photos in `remotion/public/hand/`
  (`process_hand.py` regenerates `processed/` + `hand.json`). Nib tracks the
  pen tip, grips alternate per stroke, soft shadow, jitter.
- **Six scene types** fully built and visual-first (`remotion/src/scenes/`):
  section_title, character_scene, quote_card, list_card, stat_chart, recap_card.
- **The Cast** (flat-filled proprietary characters) + **13 animated effects**
  + narration-synced drawing. This is the one character system the **production
  scenes use** (LinePeople v2 retired).
- **The template layer (Phase 6):** `content/template.md` is the writing bible
  (skeleton, atomic unit, pacing, verb→pose table, hook/CTA rules). Schema v2.1
  adds `section_title.role` (part/principle kickers), the `cta` scene, `recap_card.scope`,
  and a Script `template` block with consistency validation. Two entrance modes:
  `enter:"draw"` (hand draws in place) / `enter:"walk"` (true off-screen stride-in,
  alive, then squash-turn). Narration pace set to **-18%** (~150 wpm) so the
  word budget renders to time.
- **Video #1 (production):** `content/videos/atomic-habits.json` — Atomic Habits
  by James Clear, 32 scenes, ~1,453 words, book-structure (2 parts, 7 principles),
  renders to ~10 min with all five cast, both entrances, two-char/seated-desk/held-props.
- Style reference: `content/videos/sample-video.json` ("Mr. Market", 12 scenes).
- **Scene enrichment (Phase 7):** scenes are now FULL + colorful, not lone
  figures on blank cream. `SCENE_PALETTE` (5 muted marker tones) + 6 named
  **stages** (`drawing/stage.ts`, wash in, ground everywhere) + **tier
  hero|ambient** (hand-drawn vs washed-in) + a **colored-fill prop/metaphor
  library** (`drawing/props.ts`, +24 metaphors with flat fills). Characters
  stay ink + one flame (frozen). Video #1 re-staged (snowball/valley/mountain/
  target/calendar/spotlight) + a staged thumbnail. Dev stills: `PropSheet`,
  `StageSheet`.

**Brand palette (Phase 4 start) — DONE.** `remotion/src/theme.ts` `COLORS`:
paper `#FAF6EE`, ink `#1C1A17`, flame `#E8501E` (accent), marker `#FFD95C`,
slate `#2F6690` (charts only), `flameSoft` (bg tint). Old `#E63946` retired.

---

## The Cast — where we are (Phase 4, iterations 1–5 + integration)

A proprietary **flat-filled vector cast** of 5 characters, built on an
angle-based forward-kinematics rig. **Status: APPROVED and WIRED INTO
PRODUCTION (Phase 5).** The cast is now the one and only character system —
**LinePeople v2 is retired** (component + joint poses deleted; `drawing/stick.ts`
and `drawing/character.ts` keep only the shared face/pose-name primitives the
cast uses). The full sample video renders entirely with the cast (schema v2.0).

Cast: **Alex** (everyman, flame sneakers), **Sage** (mentor; glasses+beard+
bowtie, leanest), **Max** (volatile; stocky+tie, widest), **Maya** (A-line
torso + ponytail + hairband), **Pip** (small/round + flame beanie).

Approved by the producer across iterations:
- ✅ Flat-filled bodies, distinct silhouettes, clean torsos, brand colors.
- ✅ **FK rig** (iter 3): poses are angles, not points; real arcs; shoulder/hip
  sockets correct (arms from shoulders with a paper gap, hands at thighs).
- ✅ **Mitt hands** with poses (open/point/fist), bigger shoe feet.
- ✅ **Motion**: easing, anticipation+overshoot+settle, follow-through, seeded
  idle, weighted walk — all tunable from `theme.ts`.
- ✅ **Side-view rig** (iter 4): walking + sitting are now side-profile (no more
  jumping-jack/sumo-squat). Profile heads, near/far limbs, side hair/accents.
- ✅ **Turn** (side→front squash), **neck clearance**, **hand-anchor API**
  (`holding: {prop, hand}` → prop gripped in hand; chair/desk props).
- ✅ **Side-view parity** (iter 5): both views derive from ONE proportion
  source (`castProps`), so build reads in profile (Max unmistakably heavy, Pip
  small+round) — side silhouette lineup passes the no-face test. Limb thickness
  identical across views. Deliberate profile accents (tie strip, bowtie knot,
  hairband arc) always visible. Seat-by-default (`seat: chair|desk|none`): a
  seated figure always sits ON something, drawn seat-first in the stroke plan;
  seated arms rest on lap (or desk). Clean `inkFar` far-limb token (no grey
  smear). Turn's narrow frames render a simplified body-mass-only state.

**Latest deliverables (for producer):** `design/cast/`
- `character-sheet-1-poses.png`, `-2-expressions.png`, `-3-hands-gestures.png`,
  `-4-side-view.png` (sheet 4 now has the side-silhouette lineup + clean turn strip)
- `motion-test-v6.mp4` (~26s: side walk → turn → point → sit at desk w/ hands on
  desk; Maya carrying a book; Sage/Max duo; Pip double-take)
- `brand-thumbnail.png`, `brand-section-title.png` (brand colors in situ)

**Phase 5 — wired into production (this phase):**
- ✅ Polish: Pip rounder (short-stature belly term), Sage side hair trimmed,
  desk legs reach the floor, all 7 expressions ported to profile (distinct side
  mouths/brows; neutral ≠ tired).
- ✅ **Schema v2.0** (breaking): `kind:"figure"` is a cast member (`cast`,
  `facing`, `view`, `seat`, `holding`, `enter:{walk}`, sync-driven
  `expressions`); `hair/glasses/tie/flip` removed. Thumbnail + quote_card gain
  `cast`.
- ✅ **CharacterScene** drives the cast end to end (draw-in → fill-wipe → face
  last, seats drawn first, held props, walk-in + squash-turn, action + overlay
  effects, sync expression swings). **Thumbnail** + **QuoteCard** render via the
  cast renderer.
- ✅ **LinePeople retired.** `sample-video.json` is the **showcase** (12 scenes,
  ~101s, every scene type): Alex the investor, Max as Mr. Market, Sage delivers
  the Graham quote, Pip the comic beat.

---

## Key files

```
remotion/src/
  theme.ts                 ALL constants: COLORS, FONTS, LAYOUT, DRAW, MOTION, EASING_BEZIER, GRID
  schema.ts                Zod script schema v2.0 (cast is the one figure system)
  scenes/                  the 6 production scene components (CharacterScene drives the cast)
  Video.tsx / Root.tsx     main composition + registered compositions/stills
  Thumbnail.tsx            cast-rendered thumbnail figure
  components/
    PhotoHand.tsx          photographed hand overlay
    DrawingBoard.tsx       stroke-reveal engine + hand + fill-wipe hook
    Effects.tsx            13 animated effects
    CastCharacter.tsx      CAST alive/draw-in + turn + held props + seats  <-- the renderer
    CastFigure.tsx         CAST static renderer (sheets)
  drawing/
    cast.ts                CAST data + front & side renderers, castProps, torso, hands, props, grips, seats
    castPose.ts            CAST angle poses (front + SIDE_POSES), FK, walk, interpolation, turn segments
    motion.ts              seeded idle life (standing + seated)
    character.ts           face + expression helpers (shared by the cast; LinePeople body retired)
    stick.ts               Pt / StickPose / viewBox / circlePath primitives (LinePeople rig retired)
    props.ts/icons.ts/plan.ts/sync.ts/layout.ts
  CastSheet.tsx CastGestureSheet.tsx CastSideSheet.tsx CastCheckSheet.tsx MotionTest.tsx  (cast approval materials)
pipeline/                  generate_audio.py, build_manifest.ts, build_captions.ts, package.ts, build.ts, process_hand.py
content/videos/sample-video.json, content/schema.md
design/cast/               cast approval deliverables (sheets + motion tests)
```

Rendering the cast approval materials (stills/compositions, not the pipeline):
`npx remotion still remotion/src/index.ts CastSideSheet out.png`
`npx remotion render remotion/src/index.ts MotionTest out.mp4 --public-dir=remotion/public`

---

## Next step (cast is wired — these remain)

Later phases still untouched: GitHub Actions rendering, chunked rendering,
content calendar/scheduler, the book-structure (Part → Principle) script format.
Polish backlog from the Phase-5 showcase review lives in the session memory.
