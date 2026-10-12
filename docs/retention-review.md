# Monthly retention review

A 20-minute ritual that turns YouTube's audience-retention graphs into concrete
template changes. Run it once a month across the month's long-form uploads.

## What you need
- Each video's `retention-map.txt` (shipped in its package — scene id + TYPE at
  each timestamp).
- YouTube Studio → each video → **Analytics → Engagement → Audience retention**.

## Steps

1. **Screenshot** each video's retention curve (the absolute-retention graph).
2. **Mark the dips.** For every notable drop or dip, read the timestamp off the
   graph and look it up in `retention-map.txt` → you get the exact **scene id**
   and **scene TYPE** (and part) where viewers leave.
3. **Tally by scene TYPE** across all the month's videos. Fill the table below —
   you're looking for a TYPE that repeatedly bleeds viewers, not one-off dips.

   | Scene TYPE | # dips this month | Typical position | Notes |
   |---|---|---|---|
   | character_scene | | | |
   | section_title | | | |
   | stat_chart | | | |
   | list_card | | | |
   | quote_card | | | |
   | recap_card | | | |
   | cta | | | |

4. **Also log:** the biggest single dip (video + scene id), and the strongest
   *retention lift* (a spike up / replayed section — do MORE of that).

## From dips → template changes

Map the pattern to a candidate change in `content/template.md`:

| Symptom | Likely cause | Template change candidate |
|---|---|---|
| Dip at the FIRST 15–30s | hook too slow / promise late | tighten the hook; state the promise sooner (see §6, `promise` tag) |
| Dip at every `section_title` | part boundaries feel like "ad breaks" | shorten titles; add a re-hook line (see §3b) |
| Dip mid-`character_scene` | scene runs >~20s with no visual change | add a reveal/pose-swing; split the scene (progressive pacing §4d) |
| Dip at `recap_card` (mid) | recap feels like the end | reframe mid-recaps as "so far → next" bridges |
| Steady bleed after the midpoint | pacing sag | more metaphors/stats; trim filler principles |
| Cliff at `cta` | outro too long | shorten the close; move CTA earlier/shorter |

## Output
One line per change you'll make this cycle (keep it to 1–3 changes — small,
testable), committed as edits to `content/template.md`. Re-measure next month.
