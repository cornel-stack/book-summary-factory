# Book Summary Video Factory

A fully data-driven pipeline that turns **one script JSON file** into a complete
YouTube upload package: a 1080p MP4, an SRT captions file, a thumbnail PNG, and
a title+description text file. Whiteboard / hand-drawn visual style.

Adding a new video **never requires code changes** — only a new JSON file in
[`content/videos/`](content/videos/).

## Core principle: audio-first timing

Narration audio is the source of truth for all timing:

1. **Audio** — `generate_audio.py` runs each scene's narration through
   edge-tts (free Microsoft neural voices) → one MP3 per scene + per-word
   timestamps.
2. **Manifest** — `build_manifest.ts` measures each MP3 with `ffprobe` and
   lays scenes out in frames (30fps) → a timing manifest. Durations are never
   hardcoded.
3. **Render** — the Remotion composition reads the script + manifest as input
   props and sizes each `<Sequence>` from the manifest. Each scene carries its
   own narration audio, so scene N's audio plays during scene N's frames.
4. **Captions** — `build_captions.ts` turns word timings into a grouped SRT
   (~7 words / 42 chars per line).

## Stack

- **Remotion v4** (TypeScript/React) — rendering
- **edge-tts** (Python) — narration audio + word boundaries
- **ffmpeg / ffprobe** — audio measurement (and later video stitching)

## Repo layout

```
remotion/        Remotion project
  src/scenes/      one component per scene type
  src/components/  shared pieces (StickFigure, DrawPath, Paper)
  src/theme.ts     ALL magic numbers (fps, resolution, colors, fonts, margins)
  src/schema.ts    Zod schema shared by pipeline + composition
  src/Root.tsx     registers Main + Thumbnail compositions
pipeline/        orchestration (Node + Python)
  generate_audio.py  script JSON → per-scene mp3 + word timings
  build_manifest.ts  audio → timing manifest
  build_captions.ts  word timings → SRT
  package.ts         assemble final package
  build.ts           end-to-end sequencer (the one command)
content/
  videos/          one JSON per video (the only per-video input)
  schema.md        human-readable schema docs
output/          final packages land here (gitignored)
```

## Setup (once)

```bash
# Node deps
npm install

# Python venv + edge-tts
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# ffmpeg must be on PATH (sudo apt install ffmpeg)
```

## Build a video

```bash
npm run build:video -- sample-video
```

This runs the whole pipeline and writes `output/sample-video/`:

```
sample-video.mp4      1920x1080, 30fps
captions.srt
thumbnail.png
description.txt
```

### Individual steps (for debugging)

```bash
.venv/bin/python pipeline/generate_audio.py sample-video
npx tsx pipeline/build_manifest.ts sample-video
npx tsx pipeline/build_captions.ts sample-video
npm run studio        # live preview in Remotion Studio
```

## Visual style — the drawing hand

The brand is a **real photographed hand** holding a pen that visibly **draws**
each illustration in real time, synchronized to the narration:

- `remotion/public/hand/` — the source photos + `hand.json` (pen-tip pixel,
  scale, shaft angle per image). Mattes are generated into `processed/`.
  `pipeline/process_hand.py` regenerates them.
- `components/PhotoHand.tsx` — positions the photo so the pen nib sits on the
  live stroke point, tilts it a few degrees into the stroke, adds a soft drop
  shadow that separates on lift, ±1px jitter while drawing, and alternates the
  two grip photos per stroke. Falls back to a vector hand if `hand/` is empty.
- `remotion/src/drawing/` — the engine: shape library (`character.ts`
  expressive LinePeople, `stick.ts` joint rig, `props.ts`, `icons.ts`), the
  draw-plan + hand solver (`plan.ts`, via `@remotion/paths`), and the sync
  resolver (`sync.ts`).
- `components/DrawingBoard.tsx` — schedules every stroke (each element's whole
  draw capped at ~2.5s), tracks the pen, swaps finished drawings for their
  **alive** overlay, and fades in keyword labels.
- `components/Effects.tsx` — an animated-effects language (thought bubbles,
  question marks, idea flash, sparkles, money, shake/nod, …) that make actions
  *look* like actions. Effects attach to characters and use the same `sync`.
- Elements declare `sync: { phrase }` — drawing/effects start when the narrator
  says that phrase (resolved from edge-tts word timestamps; a missing phrase
  fails the build). Draw speed + cap are `theme.ts` constants.

## Characters & effects

`character_scene` uses **LinePeople**: monoline figures with a round head +
face (7 expressions), torso volume, pose transitions, and variants (hair,
glasses, tie). Pair them with effects to illustrate verbs — see the
verb→pose+effect table in [`content/schema.md`](content/schema.md).

## Scene types

All six are fully implemented and visual-first (see
[`content/schema.md`](content/schema.md)): `section_title` (marker
underline/circle), `character_scene` (drawn + alive LinePeople, props &
effects), `quote_card` (drawn quote marks, line-by-line), `list_card` (drawn
icons), `stat_chart` (hand-drawn axes + line/bars with written values),
`recap_card` (numbered circles, ticked). Fonts: Caveat (headings/labels),
Inter (body).

## Thumbnails

A drawn-scene `Thumbnail` composition (expressive figure + props + Caveat
headline with marker underline). The pipeline emits both `thumbnail.png`
(1920×1080) and `thumbnail-1280x720.png` (YouTube's native size).

## Rendering on GitHub Actions (the factory)

Render a video entirely on GitHub's free runners — no local machine, no
secrets (edge-tts needs no API key). The render is **chunked**: the frames are
split into N parallel jobs, then concatenated and the audio muxed.

**Trigger a render:** Actions tab → **Render video** → *Run workflow* → set
`video_id` (e.g. `atomic-habits`) and `chunks` (default `8`). Three jobs run:
1. **prepare** — audio (edge-tts) + manifest + captions + the density lint +
   the full audio track; uploads one `prepared-<id>` artifact and the frame count.
2. **render** (matrix of `chunks` jobs) — each renders its frame range
   (`--frames=START-END --muted`) to a chunk; uploads it.
3. **stitch** — concat the chunks (stream copy), mux the audio, render the
   thumbnail, package → one artifact **`<id>-package`** (the full upload set).

**Download the result:** the finished run's *Artifacts* → `<id>-package`
(mp4, SRT, thumbnails, description.txt). Per-chunk + stitch times are in the
run's job summary. Raise `chunks` for more parallelism (≈ frames ÷ chunks per
job at ~15 fps). **`lint.yml`** also runs on any push/PR touching `content/**`
for fast schema + sync-phrase feedback.

The **local** pipeline is unchanged — `npm run build:video -- <id>` runs the
exact same scripts CI calls; there are no CI-only code paths.

## Publishing this repo (public)

`.gitignore` already excludes `output/`, generated audio
(`remotion/public/assets/`), `node_modules/`, and `.venv/`. The vendored Open
Peeps parts (`remotion/assets/peeps/`, **CC0** — see its `LICENSE.md`) are
intentionally committed. There are **no secrets** in the repo.

Create the public repo and push (run these yourself — nothing was pushed for you):

```bash
# with the GitHub CLI
gh repo create <your-user>/book-summary-factory --public --source=. --remote=origin --push

# or manually
git init -b main            # if not already a git repo
git add -A && git commit -m "Book Summary Video Factory"
git remote add origin https://github.com/<your-user>/book-summary-factory.git
git push -u origin main
```

First test run: after pushing, open **Actions → Render video → Run workflow**,
leave `video_id=atomic-habits`, `chunks=8`, run, and download
`atomic-habits-package` when it finishes.

## Not yet implemented (later phases)

The content calendar/scheduler and the direct-to-YouTube upload step.
