# Playbook — a PerCuriam law short (vertical, 30–60s)

PerCuriam explains everyday US law to normal people. A short is ONE rule, made
useful in under a minute. Brand layer handles the look (navy accents, amber
highlight, navy caption tick, disclaimer on the end-card).

## Structure (schema: `brand:"percuriam"`, `format:"short"`, `framing:"explainer"`)

```
HOOK      Max as the confused everyman walks into the scenario / voices the
          misconception. short_hook = the misconception as on-screen text.
RULE      the rule in plain words (1 scene) — "Here's what the law actually says."
DO THIS   the "what to actually do" takeaway (a list_card, chip style).
END-CARD  cta scene → brand end-card (wordmark + domain + CTA + DISCLAIMER).
```

- Pull the topic + hook_angle + 3 key points from `content/percuriam/topics.json`.
- Max = the everyman (confused/worried → relieved). Sage = the explainer when a
  "here's the rule" authority beat helps.
- **Never state a state-specific rule as universal.** If it varies, say "in most
  US states" in the narration and keep the takeaway general ("check your state's
  rule / your lease").
- The disclaimer is automatic on the end-card (brand) and in every description
  (`package_short.ts`). You may also have Max say "this is general info, not
  legal advice" in the hook for sensitive topics.
- ≤ ~130 words total (≈ 50s). Numbers as words ("fourteen days", not "14").

## Example beat (security deposit short)
- HOOK: Max, worried — "My landlord kept my whole deposit. Can they just do
  that?" (short_hook: "They kept my WHOLE deposit?!")
- RULE: In most US states a landlord can only keep what covers unpaid rent or
  damage beyond normal wear and tear — and usually must send an itemized list
  within a set number of days.
- DO THIS: photos at move-out · ask for the itemization in writing · small
  claims if they stonewall.
- END-CARD: PerCuriam · percuriam.app · "Educational content — not legal advice."
