# Shorts template — kinetic, character-free (v1 · Oct 2026)

How every ReadLark short is written. The old derived shorts (a static cast
figure + recycled longform narration) were retired: no hook, nothing moving,
6-second dead frames. Shorts are now **hand-written, ~60 s (1 minute), all `kinetic`
scenes**: motion graphics, big type, karaoke captions and SFX. No characters.

Reference: `content/videos/atomic-habits-k01.json` (layouts/fields; it predates the 1-minute rule at 31 s).
Rendered by `remotion/src/short/KineticScene.tsx` (one component per layout).

## 1. Shape of a short — ~60 s (≈150–165 words, `rate: "-5%"` ≈ 155 wpm final)

```
HOOK      0–3 s    layout:"hook"     the claim, ON SCREEN AT FRAME 0, 8–12 spoken words
LOOP      3–10 s   any               open a loop / raise stakes ("the 2nd rule is the one nobody follows")
BEATS     10–48 s  5–7 scenes        one idea per scene; a mini-story or example; strongest point in the MIDDLE
PAYOFF    48–57 s  statement/steps   close the loop, the actionable takeaway
LOOP-OUT  last 3 s statement         last sentence runs grammatically INTO the hook line
```

**Hard window 50–66 s** (`build_manifest.ts` fails the build outside it). ~9–11 scenes.
At a minute, retention needs a SECOND hook around 25–30 s ("but here's the part
nobody tells you…") — re-open a loop mid-way.

- **One scene = one beat = 4–8 s.** Something new must land every 1.5–2 s:
  that's what the item `sync`s are for (each item pops/whooshes on its phrase).
  A scene longer than ~8 s needs ≥2 synced items.
- **Set `"loop": true`** and end on an unfinished sentence that completes with the
  hook, e.g. `"…That's Atomic Habits by James Clear. So remember,"` → (replay)
  `"Get one percent better every day…"`.
- **No spoken subscribe CTA and no end card.** The renderer automatically shows a
  silent "Follow for 1 book a day" pill at 65% of the runtime, plus a
  progress bar and watermark. A spoken outro breaks the loop.
- Numbers in narration are **words** ("thirty seven"); in `visual` they're digits.

## 2. Hook formulas (pick one per short, vary across the day's 3)

| Pattern | Example |
|---|---|
| Contrarian | "Setting goals is why you keep failing." |
| Specific number | "Get one percent better a day and you're thirty seven times better in a year." |
| Reframe | "You don't have a motivation problem. You have a systems problem." |
| Stakes / loss | "A janitor left eight million dollars. A Harvard executive went broke." |
| You're doing it wrong | "You're saving money wrong, and compounding is why." |
| Stop / instead | "Stop budgeting. Do this instead." |
| Question | "Why does doing nothing make you richer than doing everything?" |
| List promise | "Three money rules rich people follow that nobody teaches you." |

Hook text on screen ≤10 words, the 1–2 key words in `accent` (amber block).
Never open with the book title, a greeting, or "In this video".

## 3. Layouts (`type:"kinetic"`, `visual.layout`)

| layout | use for | fields |
|---|---|---|
| `hook` | scene 1 only | `text` ≤10w, `accent[]`, `icon?` |
| `statement` | a reframe / punchline / loop-out | `text` ≤12w, `accent[]`, `icon?`, `sync?` |
| `number` | any stat; counts up with riser + ding (shows a pulsing "?" until `sync`) | `value`, `prefix?`, `suffix?`, `decimals?`, `label` ≤6w, `sync` |
| `versus` | X vs Y, wrong vs right | `left`/`right` `{label ≤3w, icon?, sync?}`, `winner?` |
| `steps` | 2–5 rules/steps; `countdown:true` numbers 3→2→1 | `title?`, `items[{label ≤5w, sync}]` |
| `icons` | a process/loop (cue → craving → response → reward) | `title?`, `items[{icon, label ≤3w, sync}]` (≤4) |
| `curve` | compounding / growth over time | `label`, `to` (end label), `contrast?` (decaying line), `sync` |
| `quote` | one short book quote (≤110 chars), karaoke-highlighted | `quote`, `attribution` |

`icon` = any prop from the illustration library (`schema.ts` PROP_KINDS:
`staircase`, `trendup`, `hourglass`, `brain`, `coins`, `target`, `dominoes`,
`seedling`, `calendar`, `book`, …). Never use 3 same layouts in a row.

Captions are automatic (1–3 words, mid-screen, active word amber) except on
`hook` and `quote`, which caption themselves.

## 4. The day's 3 shorts

- Three **different** ideas from the longform, three **different** hook patterns.
- At least one uses `number` or `curve`, at least one `versus` or `steps`.
- File names: `content/videos/<slug>-s01.json` … `-s03.json` (`run_day` picks these up).
- `title`: the hook as a claim + one emoji + `#<book-hashtag>` (≤100 chars);
  `pinned_comment`: one question that invites a one-word reply.

## 5. Checklist

- [ ] Scene 1 is `layout:"hook"`; its narration states the claim in ≤12 words.
- [ ] ~60 s (≈150–165 words, 50–66 s hard window); every scene ≤8 s or ≥2 synced items; a re-hook at ~25–30 s.
- [ ] Every `sync` phrase is verbatim narration (run `validate_script.ts`).
- [ ] `loop:true`, last line flows into the hook; no CTA scene, no spoken "subscribe".
- [ ] `rate: "-5%"`, all scenes `type:"kinetic"`.
