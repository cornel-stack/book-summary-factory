# Playbook — deriving shorts from long-form

`pipeline/derive_shorts.ts` turns a long-form script into one vertical short per
principle/section. It works for **both brands** (ReadLark book summaries and
PerCuriam law explainers). This doc is how to make the output good.

```
npx tsx pipeline/derive_shorts.ts <source-id> [--max N]
# → content/videos/<source-id>-s01.json, -s02.json, …
```

## What the tool does (mechanical first pass)

For each `section_title role:"principle"` and the scenes under it, it emits a short:

```
HOOK      synthesized 1-sentence re-hook (names the book/topic) + short_hook overlay
IDEA      the section's best story scene (a character_scene), reused verbatim
TAKEAWAY  the section's application (its list_card), if the total stays ≤ ~60s
END-CARD  brand end-card (cta scene → wordmark + domain + prelaunch CTA)
```

Source narration is **reused verbatim** so every `sync` phrase still resolves.
The short runs through the same schema + lint + the 20–70s runtime guard.

## Where a human must tighten (before publish)

The mechanical pass is a draft. Fix these by hand:

1. **The hook.** The generated hook is a template (`HOOK_FORMULAS`). Rewrite it
   to a real scroll-stopper using a re-hook formula (number shock, costly
   mistake, contrarian). The first 2 seconds decide everything.
2. **Self-containment.** A reused story scene may open with "Here's the trap…"
   or name a character the viewer hasn't met. Trim/re-point the first sentence
   so the short stands alone.
3. **Length.** Aim **30–55s**. If the guard reports 60–70s, cut the weakest
   sentence from the idea scene (keep any word that a `sync` phrase needs).
4. **Vertical framing.** The idea scene is reused at its 16:9 layout, scaled and
   zoomed into the safe zone. If the hero sits far off-center, recenter the
   figure's `at.col` (a single figure reads best around `col:3,w:6`) and drop
   side props that fall outside the vertical safe zone.
5. **One idea only.** If the section tried to teach two things, keep the sharper
   one.

## Feedback loop

When a hand-fix recurs across many shorts, encode it back here (or into
`derive_shorts.ts`). Known recurring fixes so far:
- Generated hooks are generic → always rewrite (tracked; a future pass could
  pull the section's own punchiest line as the hook).
- Figures derived from left-placed long-form scenes aren't centered → recenter.

## PerCuriam note

Deriving from a PerCuriam long-form yields law shorts automatically. Keep the
disclaimer discipline: the end-card already carries it (brand layer), and
`package_short.ts` appends it to every description. Never let a derived hook
imply a universal rule where the source said "in most US states".
