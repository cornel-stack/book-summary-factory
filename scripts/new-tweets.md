# Playbook — 3 tweets per brand per weekday

Output: `content/tweets/<brand>/<YYYY-Www>.md` (one file per ISO week), with a
`## <YYYY-MM-DD> (Day)` heading per weekday and the 3 tweets under it.

## The daily set (3 tweets)
1. **Insight / hook** — the single sharpest idea, stated boldly. No hashtags
   needed; the line is the hook.
2. **Practical tip / thread-starter** — something actionable, or "🧵" opener
   that could expand into a thread.
3. **Engagement question** — invite a reply ("Which one are you guilty of?").

## Rules
- ≤ 280 characters each. ≤ 2 hashtags total per tweet (often zero reads better).
- Brand voice: ReadLark = practical/literary; PerCuriam = calm, myth-busting.
- **PerCuriam:** never give state-specific rules as universal; add "(varies by
  state)" or "general info, not legal advice" when the topic is sensitive.
- Prelaunch: it's fine to tease ("launching soon") but don't spam a link daily.
- Tie to that day's video/article topic so the week is coherent.

## File shape
```md
# <Brand> tweets — week <YYYY-Www>

## 2026-10-12 (Mon) — <topic>
1. <insight>
2. <tip / 🧵>
3. <question>

## 2026-10-13 (Tue) — <topic>
...
```
