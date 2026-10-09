# Playbook — one article per brand per weekday (markdown)

800–1,200 words, SEO-aware, posted manually. Output:
`content/articles/<brand>/<YYYY-MM-DD>-<slug>.md`.

## Front matter (every article)
```md
---
title: "<60-char headline with the primary keyword>"
slug: <kebab-case>
meta_description: "<150–160 char summary with the keyword>"
brand: readlark | percuriam
date: YYYY-MM-DD
tags: [tag, tag, tag]
---
```

## Body rules
- One `# H1` (the title), then `## H2` section headers (3–6), short paragraphs,
  a bullet list or two. Scannable.
- Primary keyword in the H1, the first paragraph, and ≥1 H2.
- End with a short takeaway + the brand CTA line.

## ReadLark (book-insight pieces)
- Tie to the week's video(s): expand one idea from the book with a fresh angle.
- Natural internal backlinks to related pieces; one soft mention:
  *"(ReadLark turns books like this into 10-minute summaries — launching soon.)"*
- Voice: warm, practical, a little literary.

## PerCuriam (law topics expanded)
- Expand a `topics.json` entry into a plain-English guide.
- **Disclaimer footer is mandatory:** end with
  *"This article is educational information, not legal advice. Laws vary by state;
  consult a licensed attorney for your situation."*
- Backlink to `percuriam.app`. Use "in most US states" where it varies. Never
  present a state-specific rule as universal.
- Voice: calm, clear, reassuring; no legalese.
