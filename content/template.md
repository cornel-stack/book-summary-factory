# The Channel Template — writing bible (v1)

This is **how every video is written**, above the mechanical schema
(`content/schema.md`). The schema says what's *valid*; this says what's *good*.
A script that passes Zod but breaks these rules is a bad script. Default
framing is **book-structure** (one book, one mental model, taught in parts).

---

## 1. The video skeleton

```
HOOK            1 scene    ~15–25 s   name the book; promise the one idea
  → CTA (card)  1 scene    ~5–8 s     "subscribe / full notes below" (after the hook)
BOOK INTRO      1–2 scenes ~25–40 s   who wrote it, why it matters, the surrogate (Alex) picks it up
PART 1          title + 2–4 PRINCIPLE sections
  MID-RECAP     1 scene    ~15–20 s   recap_card scope:"mid"
PART 2          title + 2–4 PRINCIPLE sections
  MID-RECAP     1 scene    ~15–20 s
  (PART 3 …     optional, same shape)
FINAL RECAP     1 scene    ~20–30 s   recap_card scope:"final"
CLOSE           1 scene    ~15–20 s   the one-line takeaway
  → CTA (corner)1 scene    ~5–8 s     "which habit will you start? — comment" (at the close)
```

- A **PART** = a `section_title` with `role:"part"`, `number:N`. It groups
  principles; its title is the part's big idea.
- A **PRINCIPLE** = a `section_title` with `role:"principle"`, `number:M`,
  `part:N`, followed by the scenes that teach it. This is the atomic teaching
  unit (see §3).
- **Mid-recap after EVERY part.** No exceptions — it's the spaced-repetition beat.
- At most **2 CTAs** per video: one after the hook, one at the close. Never salesy.

---

## 2. Schema hooks this template uses (v2.1)

- `section_title.role` = `"part" | "principle"` + `number` (+ `part` for a
  principle) → renders a "PART 1" / "PRINCIPLE 2" kicker.
- `recap_card.scope` = `"mid" | "final"`.
- `cta` scene = `{ text, style:"card"|"corner" }`.
- Script-level `template` = `{ framing:"book-structure"|"listicle",
  hook:"direct"|"cold-open" }`. **book-structure requires the book title or
  author in scene 1's narration** (enforced by the schema).

---

## 3. The atomic unit (how one PRINCIPLE is taught)

Every principle section follows this beat order (not every beat is a separate
scene — fold them, but keep the order):

1. **Story / anecdote** — a concrete person or moment (character_scene). Show,
   don't define. This is where the cast acts.
2. **Principle** — the one-sentence rule, stated plainly (section_title or a
   list_card line, or spoken over the story's resolution).
3. **Quote** — a short, attributed book quote (quote_card, `cast:"sage"` to let
   Graham/Clear "deliver" it). Optional but powerful once per part.
4. **Application** — "so here's what you do" (list_card, or Alex-at-desk
   character_scene). The viewer's takeaway.
5. **Transition** — one line that hands off to the next principle/part. Usually
   the tail of the application narration; no separate scene.

A principle section is **≈ 60–90 s ≈ 150–220 narration words**, spread over
2–4 scenes.

---

## 4. Pacing rules (hard)

- **Principle length:** 150–220 words. Under 150 feels thin; over 220 drags —
  split it.
- **No single scene's narration over ~25 s (~65 words) without a visual
  change.** If a thought needs 90 words, it needs ≥2 visuals (a pose change, a
  new element drawn, a chart point, an expression swing synced to a phrase).
- **Every scene earns its visual.** Zero text-only scenes except `quote_card`.
  Section titles draw their underline/badge; recaps draw ticks; CTAs draw an
  arrow. A `character_scene` with a static figure and nothing happening is a bug.
- **Scene-variety rule:** never **3 consecutive scenes of the same type**. Break
  a run of character_scenes with a stat_chart, list_card, or title.
- **Visual ≠ dead before the voice.** A scene's drawing/animation should not
  finish more than ~8 s before its narration ends (add an idle action, a second
  pose, or a synced effect to fill). And no **dead air > 1.5 s** (silence with a
  frozen frame) anywhere.
- **Entrances:** `enter:"walk"` when a character **arrives** as a story beat
  (Mr-Market-knocks, the tempter shows up); `enter:"draw"` (default) when a
  character is **introduced** as a concept. Don't walk-in a character who's
  already on stage.
- **Two-character scenes stagger for free** (A comes alive while the hand draws
  B) — use them for dialogue/reaction beats, but give them room (≥1 empty grid
  column between figures) and keep to 2 figures.

---

## 4b. Scene art — staging, palette, metaphors (Phase 7)

Scenes must feel **full and composed**, never a lone figure on blank cream.

**Palette.** Characters keep ink + their one flame accent (unchanged). SCENE ART
uses the muted `SCENE_PALETTE` (theme.ts): `leaf` #7A9E5E, `sky` #5E8CA8,
`sand` #CBA56B, `sun` #F2C94C, `coral` #E0896B (+ paper, + ink linework).
- **Rule:** a scene's STAGE uses **≤3 palette colors**; the one hero metaphor
  prop may add its own focal color; **flame stays reserved** for the single
  emphasis object (a summit flag, a bullseye, a streak-X). Never rainbow.

**Stages** (`stage:` on a character_scene; default `plain`). Each lays a ground
so characters stand ON something:
| stage | what it is | palette |
|-------|-----------|---------|
| `plain` | subtle ground line + floor tint (focus on the cast) | sand |
| `outdoor` | sky band, clouds, rolling hills, grass, bushes | sky + leaf |
| `room` | warm wall, wood floor, window, a plant | sand + sky + leaf |
| `desk-office` | cool wall, floor, big window, wall clock, plant | sky + sand + leaf |
| `street` | sky, block buildings with windows, road | sky + sand + sun |
| `stage-spotlight` | podium light cone + floor pool (teaching beats) | sand + sun |

**Draw-time budget (hero vs ambient).** The HAND draws only **hero** elements
(characters, the key prop, the one metaphor object). Background/ambient elements
(`tier:"ambient"`, and all stages) **wash in** (soft fade ~0.45s) just before
the hand starts, so scenes feel full instantly without pen time. Use
`tier:"ambient"` for set-dressing props (a path, distant object); keep the
focal metaphor `hero` so the hand draws it.

**Composition.** Fill the frame: 3–6 elements, place the figure to one side and
its metaphor to the other (≥1 empty grid column between hero boxes — the build
warns on >30% overlap). Props that sit on the ground go in lower rows; the
figure's feet land near the ground line automatically at row≈1, h≈5.

**Metaphor library** (`propShape`, colored fills): mountain(+flag), path,
staircase, scale, hourglass, clock, calendar, trophy, target(+arrow), seedling/
sapling/tree, brain, heart, gears, ladder, wall, gift, phone, bed, dumbbell,
shoe, coffee, snowball, + the originals (book, lightbulb, moneybag, door, …).
Reach for them by meaning: compounding→snowball/staircase, a journey→path,
a goal→mountain/target, time→clock/hourglass, a streak→calendar, a reward→
trophy/gift, growth→seedling→tree, an obstacle→wall, thinking→brain.

## 4c. Density, reveals, crowds, wardrobe (Phase 9)

**Wardrobe.** Each cast member wears their `CAST_WARDROBE` color on the **torso
only** (arms stay ink — a colored top, not water-wings). Default on. The flame
accent item stays the brightest thing on every member against every stage
(contrast-verified). Silhouettes are unchanged (fills don't move outlines).

**One art style, many arrivals** (`reveal` on an element):
| reveal | what | use for |
|--------|------|---------|
| `draw` | the hand draws it | the hero, the one metaphor — what's worth watching drawn |
| `pop` | scale-in w/ overshoot | small accents, spot illustrations |
| `slide` | in from below + fade | secondary props |
| `fade` | opacity in | labels, quiet elements |
| `wash` | left→right color wipe | ambient set-dressing, stages, crowds |
Defaults: hero→`draw`, ambient→`wash`, crowd→`wash`, characters→`draw`/`walk`.
Doctrine: the hand draws what's worth watching drawn; everything else arrives
quickly so the frame fills without burning pen time.

**Crowd tier** (`kind:"crowd"` in a character_scene): tinted single-tone Open
Peeps (CC0) as a background audience — `count` 2–8, `arrangement`
`row`/`cluster`/`queue`, `tint` (a SCENE_TINT). Always behind the cast, washes
in, never hand-drawn, deterministic from the scene id. Reach for a crowd on:
**"everyone" / "most people" / "the crowd" / "a tribe" / the market / an
audience**. Never let a crowd compete — keep it low and tinted.

**Density rule.** Something NEW on screen every **6–10 s** of narration (any
reveal counts: a draw-in, a pose swing, an effect, a spot, a crowd, a chart
point). Use **spot illustrations** — small margin sketches from the prop library
(`w:2,h:2`, `reveal:"pop"`, sync-triggered, ≤0.8 s), **2–4 per principle
section** — to fill gaps. The build **lint** (`pipeline/lint_script.ts`, runs in
`build:video`, CI stdout) flags any >10 s window with nothing new, plus hero-box
collisions. Title / quote / recap cards are the allowed **calm** exceptions
(big text + a drawn mark is the focus — don't clutter them).

**Board memory.** Each principle `section_title` declares a `memory` icon (a
prop). The icons accumulate along the bottom edge through the part and wipe at
the next part boundary — a running visual summary. Default on.

**Nothing floats on cream.** Non-character scenes (titles/charts/lists/recaps/
quote/CTA) get a faint floor tint + ground line (`QuietBackdrop`), quieter than
the character-scene stages.

## 4d. Progressive pacing (Phase 10 — the overriding law)

**Never linger on one graphic. Show graphics progressively, and have as many as
possible.** Concrete rules (lint-enforced):

1. **Prefer 3 small graphics over 1 big one.** A concept explained over 20+ s of
   narration is staged as **sequential sub-reveals** — drawn/popped one at a
   time as each is spoken (e.g. a loop: cue → craving → response → reward
   appear in turn), never one drawing that sits for 20 s.
2. **Dwell cap: no element is the newest thing on screen for > 8 s** (lint
   threshold). The hero **draw cap is 2.0 s** (`DRAW.maxElementFrames`). If a
   scene's narration outruns its visuals, add spots or split it.
3. **Spots: 3–5 per principle section**, each sync-anchored to its keyword, so
   something new lands every few seconds.
4. **Calm cards stay calm but short:** `section_title` ≤ 6 s (trim narration),
   `quote_card` ≤ 12 s, `recap_card` reveals items one-by-one (never static).
5. **Board memory** lives in a reserved bottom band (never overlaps figures).
6. Pace ↔ density tension: the −18 % voice makes scenes long, which fights the
   8 s rule. The levers are (a) more sub-reveals/spots, (b) a faster `rate`, or
   (c) shorter per-scene narration — pick deliberately per video.

## 5. Verb → pose + effect cheat-sheet (cast-aware)

| Narration beat | cast + pose / expression | effect |
|----------------|--------------------------|--------|
| thinking / wondering | Alex `thinking` + `curious` | `thought_bubble`, `nod` |
| realises / idea | Alex `standing`+`happy` + a drawn `lightbulb` | — |
| excited / wins | any `celebrating` + `happy` | `sparkles`, `money` |
| shocked / bad news | Max `standing`/`panicking` + `shocked` | `exclamation` |
| worried / tempted | Max `standing` + `worried` | `sweat_drop` |
| the mentor teaches | Sage `presenting` + `happy` | — |
| a short book quote | `quote_card` + `cast:"sage"` | — |
| the tempter arrives | Max `enter:"walk"` + `presenting`, `holding` a prop | `motion_lines` |
| comic beat / "wait, what?" | Pip `standing` + `shocked` | `shake`, `exclamation` |
| makes a deal | two figures, one `facing:"left"` | `sparkles` |
| reads / studies / plans | Alex `sitting` + `seat:"desk"` + `holding:"book"` | `nod` |
| a mood swings mid-sentence | `expressions:[{value,sync}]` | matching per-swing effects |
| a number / trend | `stat_chart` (line for trends, bars for compares) | — |
| a checklist / the application | `list_card` (tick/box/arrow icons) | — |

Brand rule: one flame accent per character, `marker`/`slate` never on
characters, `slate` charts only.

---

## 6. Hooks (scene 1)

`hook:"direct"` (default) — open ON the promise. Formulas:
- **Number shock:** "This book sold fifteen million copies by proving one
  uncomfortable thing: <claim>."
- **Costly mistake:** "You're not failing at your goals. You're using the wrong
  <system>. <Book> explains why."
- **Contrarian:** "Forget motivation. <Author> found the people who change for
  good do the opposite of what you'd expect."

`hook:"cold-open"` — a 1-scene mini-story before naming the book, then cut to
the title. Use sparingly; it costs time.

**Rule:** the hook must name the book (title or author) — it's both good
practice and schema-enforced under book-structure.

---

## 7. CTA copy (non-salesy)

- After the hook (`style:"card"`): "Full notes in the description — subscribe
  if you want the next one." (~5 s)
- At the close (`style:"corner"`): "Which habit will you start today? Tell me
  below." (~5 s)

Never interrupt a principle with a CTA. Never more than one sentence.

---

## 8. Word budget math (10-minute video)

Target **1,450–1,600 words** (≈ 150 wpm narration → ~10 min). Worked example
for a 2-part book-structure video:

| Block | scenes | words |
|-------|-------:|------:|
| Hook | 1 | 55 |
| CTA (card) | 1 | 18 |
| Book intro | 2 | 150 |
| Part 1 title | 1 | 20 |
| Part 1 · 3 principles | ~9 | 3 × 190 = 570 |
| Mid-recap 1 | 1 | 55 |
| Part 2 title | 1 | 20 |
| Part 2 · 3 principles | ~9 | 3 × 190 = 570 |
| Mid-recap 2 | 1 | 55 |
| Final recap | 1 | 70 |
| Close | 1 | 55 |
| CTA (corner) | 1 | 18 |
| **Total** | **~29** | **~1,556** |

Compute the real per-scene budget from the actual structure and **verify the
sum is 1,450–1,600 before rendering** (the pipeline measures real audio, but
this keeps runtime ~10 min).

---

## 9. Pre-flight checklist (run before `build:video`)

- [ ] `template.framing` set; book named in scene 1.
- [ ] Every part followed by a mid-recap; a final recap before the close.
- [ ] ≤ 2 CTAs (one post-hook, one at close).
- [ ] No 3 consecutive same-type scenes.
- [ ] Every principle 150–220 words; total 1,450–1,600.
- [ ] Every key visual has a `sync` phrase; the phrase is in that scene's narration.
- [ ] Numbers written as words ("one forty two", not "142").
- [ ] All five cast members used; both entrance modes; ≥1 two-char scene;
      ≥1 seated-desk scene; ≥1 held prop; ≥3 stat_chart/list moments.
- [ ] Labels within word limits (figure ≤6, list ≤5, recap ≤4, headline ≤5).
