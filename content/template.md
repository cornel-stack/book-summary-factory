# The Channel Template — writing bible (v3 · long-form)

This is **how every video is written**, above the mechanical schema
(`content/schema.md`). The schema says what's *valid*; this says what's *good*.
A script that passes Zod but breaks these rules is a bad script. Default
framing is **book-structure** (one book, one mental model, taught in parts).

**LONG-FORM STANDARD (Phase 11).** Every video is **30 minutes MINIMUM**;
30–40 min is the normal band. `target_minutes` is **required, ≥ 30**, and the
build **hard-fails** (`build_manifest.ts`) if the real runtime lands below
30.0 min or outside ±10% of target. Size scripts with the measured pacing
constant — see §8.

---

## 1. The video skeleton (long-form)

```
HOOK            1 scene    ~15–25 s   name the book; promise the one idea
  → CTA (card)  1 scene    ~5–8 s     "subscribe / full notes below" (after the hook)
BOOK INTRO      2 scenes   ~35–50 s   who wrote it, why it matters, the surrogate (Alex) picks it up
PART 1          title + 2–3 PRINCIPLE sections
  MID-RECAP     1 scene    ~15–20 s   recap_card scope:"mid"
PART 2          RE-HOOK + title + 2–3 PRINCIPLE sections
  MID-RECAP     1 scene    ~15–20 s
  (PARTS 3–5 …  same shape: RE-HOOK, title, principles, mid-recap)
FINAL RECAP     1 scene    ~25–35 s   recap_card scope:"final" (one line per part)
CLOSE           1 scene    ~15–20 s   the one-line takeaway
  → CTA (corner)1 scene    ~5–8 s     "which habit will you start? — comment" (at the close)
```

- **4–6 PARTS, 9–14 PRINCIPLE sections total** (long-form). A short book still
  gets 30 min by going *deeper* — more story, more application — not by padding.
- A **PART** = a `section_title` with `role:"part"`, `number:N`. It groups
  principles; its title is the part's big idea.
- A **PRINCIPLE** = a `section_title` with `role:"principle"`, `number:M`,
  `part:N`, followed by the scenes that teach it. This is the atomic teaching
  unit (see §3).
- **Mid-recap after EVERY part.** No exceptions — it's the spaced-repetition beat.
- **RE-HOOK at every part boundary after Part 1** (see §3b) — retention is the
  whole game at 30 min.
- **~60–90 scenes per video.** The pipeline handles it (edge-tts runs a
  concurrency pool; chunked CI render fans out automatically). If a script has
  fewer than ~55 scenes at 30 min, principles are being told too thinly.
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

A principle section is **≈ 90–150 s ≈ 220–360 narration words** (long-form),
spread over **3–5 scenes**. (The old 150–220 band was for 10-min videos; at
30 min a principle earns room for a fuller story + a real application.) Still
obey the per-scene cap in §4: no single scene over ~25 s / ~65 words.

---

## 3b. The RE-HOOK (part-boundary retention beat)

At 30+ minutes the enemy is the drop-off. After **every part except Part 1**,
open the next part with a **RE-HOOK**: 1–2 narration sentences that *close the
door behind the viewer and open a new loop*. Author it as a **short dedicated
scene** right after the part title (id `pN-rehook`, a `character_scene` with the
surrogate posing + one spot prop, ~25–40 words) — never a static card, so it
carries a visual. (It may instead live in the part-title narration, but a
dedicated beat paces better and dodges the dead-window lint.)

**Re-hook formulas** (pick one, vary across the video):
- **Payoff-withheld:** "You now know *why* tiny habits win. But none of it
  sticks until you fix the one thing most people never touch — who you believe
  you are."
- **Objection-raise:** "Maybe you're thinking: I've tried this and quit. Good —
  because the next part is exactly why you quit, and how not to."
- **Stakes-raise:** "Everything so far was theory. Now it gets practical — the
  four laws that make a habit automatic whether you feel like it or not."
- **Cliffhanger-callback:** "Remember the plateau? Here's the system that gets
  you across it."

Rule: a re-hook **references what was just learned** and **names a tension the
next part resolves**. It should make skipping ahead feel like a loss.

---

## 4. Pacing rules (hard)

- **Principle length:** 220–360 words (long-form). Under 220 feels thin at this
  length; over 360 drags — split into another principle.
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

## 8. Word budget math (long-form, measured)

**The pacing constant is MEASURED, not assumed.** From the atomic-habits
Phase-10 render: 1,212 narration words produced an **8.352-minute** final video
(including scene padding + draw-ins). That is:

> **`WORDS_PER_FINAL_MINUTE = 145`**  (1,212 ÷ 8.352 = 145.1; published in
> `remotion/src/theme.ts`).

Size any script by `target_words ≈ 145 × target_minutes`. Longer videos trend a
hair longer per word (more scenes ⇒ more padding), so 145 slightly
*under*-estimates at 30+ min — which safely favors clearing the 30.0-min floor.

**Band table** (runtime guard = `max(30.0, 0.9·target)` … `1.1·target`):

| target_minutes | word target (≈145/min) | safe word band | runtime guard passes |
|---------------:|-----------------------:|---------------:|---------------------:|
| 30 | 4,350 | 4,350 – 4,780 | 30.0 – 33.0 min |
| 32 | 4,640 | 4,350 – 5,100 | 30.0 – 35.2 min |
| 35 | 5,075 | 4,570 – 5,580 | 31.5 – 38.5 min |
| 40 | 5,800 | 5,220 – 6,380 | 36.0 – 44.0 min |

Because the guard *hard-fails*, leave margin: for a 30-min minimum, prefer
`target_minutes: 32` (band 30.0–35.2 is roomy on both sides) and write ~4,600
words. Worked example for a **5-part / 12-principle** book-structure video:

| Block | scenes | words |
|-------|-------:|------:|
| Hook + CTA (card) | 2 | 75 |
| Book intro | 2 | 180 |
| 5 part titles | 5 | 5 × 8 = 40 |
| 4 re-hooks (parts 2–5) | 4 | 4 × 35 = 140 |
| 12 principle titles | 12 | 12 × 8 = 96 |
| 12 principles (bodies) | ~42 | 12 × 300 = 3,600 |
| 5 mid-recaps | 5 | 5 × 55 = 275 |
| 2 quotes | 2 | 2 × 28 = 56 |
| Final recap | 1 | 85 |
| Close + CTA (corner) | 2 | 75 |
| **Total** | **~73** | **~4,620** |

Compute the real per-scene budget from the actual structure and **verify the
sum lands in the band before rendering**. The pipeline measures real audio and
the build fails if runtime is off — this keeps the round-trip cheap.

---

## 8b. Chapters (auto-generated — don't hand-write)

YouTube chapters are generated from the render manifest by `package.ts`, so they
stay exactly aligned to the video (and the SRT) at any length — 5 chapters or
50. The `description` field holds **prose only**; `package.ts` injects a
`Chapters:` block (0:00 intro, every part + principle title at its real start,
the final recap, the close) and the attribution/disclaimer footer. Never paste
timestamps into `description` by hand — they'll drift the moment narration
changes.

---

## 9. Pre-flight checklist (run before `build:video`)

- [ ] `template.framing` set; book named in scene 1.
- [ ] `target_minutes` ≥ 30 set; word sum in the §8 band for that target.
- [ ] 4–6 parts, 9–14 principles, ~60–90 scenes.
- [ ] Every part followed by a mid-recap; a final recap before the close.
- [ ] A RE-HOOK beat at every part boundary after Part 1 (§3b).
- [ ] ≤ 2 CTAs (one post-hook, one at close).
- [ ] No 3 consecutive same-type scenes.
- [ ] Every principle 220–360 words; no single scene over ~65 words.
- [ ] Every key visual has a `sync` phrase; the phrase is in that scene's narration.
- [ ] Numbers written as words ("one forty two", not "142").
- [ ] All five cast members used; both entrance modes; ≥1 two-char scene;
      ≥1 seated-desk scene; ≥1 held prop; ≥3 stat_chart/list moments.
- [ ] Labels within word limits (figure ≤6, list ≤5, recap ≤4, headline ≤5).
- [ ] `description` is prose only — chapters are auto-generated (§8b).
