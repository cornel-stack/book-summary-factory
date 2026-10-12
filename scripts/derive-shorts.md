# Playbook — deriving shorts from long-form

`pipeline/derive_shorts.ts` turns a long-form ReadLark book summary into one
vertical short per principle/section. This doc is how to make the output good.

```
npx tsx pipeline/derive_shorts.ts <source-id> [--max N]
# → content/videos/<source-id>-s01.json, -s02.json, …
```

## What the tool does (mechanical first pass)

For each `section_title role:"principle"` and the scenes under it, it emits a short:

```
HOOK      synthesized 1-sentence re-hook (names the book/topic) + short_hook overlay
IDEA      the section's best story scene (a character_scene), reused verbatim
TAKEAWAY  the section's application (its list_card), if the total stays ≤ ~45s
END-CARD  brand end-card (cta scene) — now capped to ~1s (SHORTS_ENDCARD_SECONDS);
          the CTA has MOVED to the captions + pinned comment (see Shorts ranking)
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
3. **Length.** Aim **35–50s** (high %-watched beats long — Shorts rank on
   view-duration-relative-to-length, not CTR). The lint WARNS beyond 55s. For a
   DELIBERATE long short (e.g. a 2-min "social" explainer), set `max_seconds` on
   the script (≤175) to relax the warning — default stays 35–50s.
4. **Vertical framing.** The idea scene is reused at its 16:9 layout, scaled and
   zoomed into the safe zone. If the hero sits far off-center, recenter the
   figure's `at.col` (a single figure reads best around `col:3,w:6`) and drop
   side props that fall outside the vertical safe zone.
5. **One idea only.** If the section tried to teach two things, keep the sharper
   one.

## Shorts ranking (Phase 14 — view-duration + loops, NOT CTR)

Shorts don't rank on title/thumbnail CTR — they rank on how much of the clip
people watch and how often it loops. So:

- **2-second hook (lint-checked).** The first ~60 frames must have motion AND an
  on-screen claim. The draw-in supplies motion; `short_hook` supplies the claim —
  the lint WARNS if `short_hook` is missing. Front-load the sharpest line.
- **End-card ≤1s.** A long brand outro bleeds %-watched + loops, so the end-card
  is capped (`SHORTS_ENDCARD_SECONDS`) and the prelaunch CTA now lives in the
  **platform captions + the pinned comment** (both emitted by `package_short.ts`).
  A small persistent **wordmark watermark** carries the brand through the body.
- **`pinned_comment`.** Write one engagement question per short; it carries the
  CTA line and seeds comments.
- **`loop: true` (use on ~1 of each day's 3 shorts).** Write the FINAL narration
  line so it flows straight into the OPENING line, and compose the last scene so
  its final frame matches scene 1's opening — seamless replay. A loop short drops
  the brand end-card entirely (renders watermark-only) so the loop isn't broken.

## Feedback loop

When a hand-fix recurs across many shorts, encode it back here (or into
`derive_shorts.ts`). Known recurring fixes so far:
- Generated hooks are generic → always rewrite (tracked; a future pass could
  pull the section's own punchiest line as the hook).
- Figures derived from left-placed long-form scenes aren't centered → recenter.
