---
name: make-today
description: Produce today's ReadLark book-summary videos autonomously. Picks the next queued book from the launch plan, writes a full ~30-min longform script, then runs the pipeline (CI render → downloads to output/<date>/ → marks the book done in the xlsx). Invoke as /make-today (optionally with a book slug/title to override the pick).
---

# /make-today — the morning command

Goal: one invocation → the day's **1 longform + 3 shorts**, rendered in CI and
downloaded, with the book marked done. The user never writes JSON. YOU (Claude
Code) write the script; `npm run day` does everything after.

## Step 1 — pick the book
- If a slug/title was passed as an argument, use that book.
- Else read `content/launch-plan.json` and pick the **lowest `order` with
  `status:"queued"`**. (If `content/launch-plan.json` is missing, first run
  `npm run launch:ingest`.)
- Let `<slug>` be that book's `slug` and note its `title`, `author`, `year`,
  `category` from the plan.
- If `content/videos/<slug>.json` already exists, tell the user it's already made
  and ask whether to regenerate or pick the next book.

## Step 2 — write the longform script
Write `content/videos/<slug>.json` — a COMPLETE longform that obeys
`content/template.md` (the writing bible) and `remotion/src/schema.ts`. Use
`content/videos/atomic-habits.json` as the structural reference. Requirements:
- `format:"longform"`, `brand:"readlark"`, `template:{framing:"book-structure",
  hook:"direct"}`, `book:{title,author,year}`, `target_minutes` ≥ 30.
- **Length**: ~4,500 narration words (≈145 words/final-minute → ~31 min). 4–6
  parts, 9–14 principle sections, ~60–90 scenes.
- **Structure**: hook (names the book + states the `promise`, opens a loop) → book
  intro → PARTS (title → principles → mid-recap), with a RE-HOOK opening every
  part after Part 1 → final recap → close → `cta style:"subscribe"` (names
  tomorrow's book) → `cta style:"corner"` end screen (points at one next video).
- **SUBSCRIBE PROMPTS — ≥3, HARD-FAILED by validate + lint** (template §7):
  START = a scene-level `"subscribe": {"phrase": "...subscribe..."}` overlay on the
  last scene of principle 1 (lands ~1:30–4:00); MID = a `subscribe` overlay on a
  mid-recap at 35–65% of the runtime, paired with "comment which book I should do
  next"; END = the `cta style:"subscribe"` in the last 2 minutes. Each one is one
  value-led sentence that says "subscribe" (copy bank in template §7). Never in
  the hook, never "like and subscribe". Tomorrow's book = the next queued book in
  `content/launch-plan.json`.
- **SEO fields**: `title` = the search-led variant; `title_variants` (EXACTLY 3:
  search-led starting with the book title ≤70 chars, curiosity-led, benefit-led);
  `category` (from the launch plan); `pinned_comment` (one engagement question);
  `promise` (a verbatim phrase from the first scene, spoken ≤15 s); `description`
  (names the book in sentence 1); `tags`; `thumbnail`.
- **Visuals — SHOW, don't say (template §4e, lint-enforced)**: never a lone
  figure — every `character_scene` has the figure PLUS ≥1–2 metaphor/data props
  (reveal + sync); draw the idea with the illustration library (`dominoes`,
  `checkmark`, `brick`, `snowball`, `seedling`/`tree`, `dumbbell`, `calendar`,
  `scale`, `target`, `gears`, money/data props…). **Every enumeration** → a
  `list_card`. **Every number/stat** → a `stat_chart` (`number` count-up,
  `bars`/`line`/`area`, `pie`). **Every "X vs Y"** → a `compare`. **Multi-column
  / matrix data** (e.g. the four laws × tactics, a tracker week) → the `table`
  scene (`columns` + `rows`, `highlight` the key row). Vary scene types (never 3
  same-type in a row); keep something new every 6–10 s. Ambient motion + title/
  quote/CTA breathing are automatic — but still no dead hero > 8 s.
- **Cast — use the 13-member ensemble**: alex, sage, max, maya, pip, jade, omar,
  nadia, theo, rosa, kwame, lena, deshawn (varied age/build/hair/skin). Spread
  them across scenes; never cast one person for the whole video.
- **Thumbnail (Hybrid)**: set `punch_words` (2–3 BIG words — last renders in
  flame), an expressive `cast` + `pose:"celebrating"`/`"pointing"`,
  `expression`, 1–2 `props`, `pointer:"spotlight"`.
- **CRITICAL**: every `sync:{phrase}` (and expression/effect/datapoint/item sync)
  must be a VERBATIM substring of that scene's `narration`. Spell numbers as words
  ("thirty seven", not "37"). On-screen text within the word limits.

## Step 2b — write the 3 kinetic shorts
Write `content/videos/<slug>-s01.json`, `-s02.json`, `-s03.json` by hand per
`content/shorts-template.md` (reference: `content/videos/atomic-habits-k01.json`).
`format:"short"`, every scene `type:"kinetic"` (NO characters), `loop:true`,
`rate:"-5%"`, **~60 s each (≈150–165 words, 9–11 scenes; build fails outside 50–66 s)** with a re-hook at ~25–30 s. Scene 1 = `layout:"hook"` using a
hook formula (contrarian / number / stakes / you're-doing-it-wrong…) — a
different formula and a different idea for each of the 3. A new synced beat
every 1.5–2 s; no spoken CTA (the renderer adds the silent follow pill).

Then self-check every script (longform + 3 shorts) until clean:
```
npx tsx pipeline/validate_script.ts <slug>
npx tsx pipeline/validate_script.ts <slug>-s01   # …and -s02, -s03
```
Fix every schema/sync error it reports before continuing. (The full lint runs in
CI and HARD-FAILS on missing title_variants/promise/book-title — so get those right.)

## Step 3 — run the pipeline (hands-off)
```
npm run day -- <slug>
```
This picks up the 3 hand-written shorts, validates, schedules the calendar, commits + pushes,
triggers CI (render.yml + render-shorts.yml into one `content-<date>` bundle),
waits ~20–30 min for both runs, downloads the finished videos into
`output/<date>/`, and marks the book done (xlsx "Video" column + launch-plan).
TTS in CI auto-falls back edge → Azure → Kokoro, so narration never fails.

> For a quick local check without touching CI, run `npm run day -- <slug> --dry`.

## Step 4 — report
Tell the user: the book produced, the `output/<date>/` path, and the bundle
Release tag. If CI failed, surface the failing step (usually a lint error → fix
the script and re-run `npm run day`).
