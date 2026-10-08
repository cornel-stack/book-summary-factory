#!/usr/bin/env python3
"""
Step 1 of the audio-first pipeline.

Input : content/videos/<video-id>.json
Output: - remotion/public/assets/<video-id>/<scene-id>.mp3   (one per scene)
        - .build/<video-id>/words.json                       (per-scene word timings)

Narration audio is the source of truth for all downstream timing. We ask
edge-tts for word-boundary metadata as it streams so captions can be aligned
to the spoken word later.

Usage: python3 pipeline/generate_audio.py <video-id>
"""
import asyncio
import json
import os
import sys
from pathlib import Path

import edge_tts

REPO = Path(__file__).resolve().parent.parent
TICKS_PER_SECOND = 10_000_000  # edge-tts offsets/durations are in 100ns ticks

# Long-form videos have 60–90 scenes; synthesizing them one at a time is silly
# (each edge-tts call is network-bound). Run a small concurrency pool instead.
# Kept modest so the Microsoft endpoint doesn't rate-limit. Override with
# AUDIO_CONCURRENCY. Word-timing order within a scene is unaffected (per-call);
# scene order in words.json is restored explicitly after the gather.
AUDIO_CONCURRENCY = int(os.environ.get("AUDIO_CONCURRENCY", "6"))

# Channel-wide narration pace. The neural voices default to ~180 wpm, which is
# too brisk for a book summary; -18% lands a measured ~150 wpm (so the template's
# 1,450–1,600-word / ~10-minute budget actually renders ~10 minutes). Override
# per-script with a top-level "rate" field.
DEFAULT_RATE = "-18%"


async def synth_scene(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    """Synthesize one scene to mp3, returning per-word timings (seconds)."""
    # edge-tts 7.x defaults to SentenceBoundary; we need per-word timing.
    communicate = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words: list[dict] = []
    with out_mp3.open("wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / TICKS_PER_SECOND
                end = (chunk["offset"] + chunk["duration"]) / TICKS_PER_SECOND
                words.append(
                    {"text": chunk["text"], "start": round(start, 3), "end": round(end, 3)}
                )
    return words


async def main(video_id: str) -> None:
    script_path = REPO / "content" / "videos" / f"{video_id}.json"
    if not script_path.exists():
        sys.exit(f"ERROR: script not found: {script_path}")

    script = json.loads(script_path.read_text())
    voice = script.get("voice", "en-US-AndrewNeural")
    rate = script.get("rate", DEFAULT_RATE)
    scenes = script.get("scenes", [])
    if not scenes:
        sys.exit("ERROR: script has no scenes")

    audio_dir = REPO / "remotion" / "public" / "assets" / video_id
    build_dir = REPO / ".build" / video_id
    audio_dir.mkdir(parents=True, exist_ok=True)
    build_dir.mkdir(parents=True, exist_ok=True)

    # Validate up front so an empty narration fails fast (not mid-pool).
    for scene in scenes:
        if not scene.get("narration", "").strip():
            sys.exit(f"ERROR: scene '{scene['id']}' has empty narration")

    sem = asyncio.Semaphore(AUDIO_CONCURRENCY)
    done = 0
    total = len(scenes)

    async def worker(i: int, scene: dict) -> tuple[str, list[dict]]:
        nonlocal done
        sid = scene["id"]
        narration = scene["narration"].strip()
        out_mp3 = audio_dir / f"{sid}.mp3"
        async with sem:
            words = await synth_scene(narration, voice, rate, out_mp3)
        if not out_mp3.exists() or out_mp3.stat().st_size == 0:
            sys.exit(f"ERROR: no audio produced for scene '{sid}'")
        done += 1
        print(
            f"  [{done}/{total}] {sid}: {out_mp3.name} "
            f"({out_mp3.stat().st_size} bytes, {len(words)} words, rate {rate})"
        )
        return sid, words

    print(f"Synthesizing {total} scenes with concurrency {AUDIO_CONCURRENCY}…")
    results = await asyncio.gather(*(worker(i, s) for i, s in enumerate(scenes)))

    # Restore scene order (gather completes out of order under concurrency).
    order = {s["id"]: i for i, s in enumerate(scenes)}
    all_words: dict[str, list[dict]] = {
        sid: words for sid, words in sorted(results, key=lambda r: order[r[0]])
    }

    words_path = build_dir / "words.json"
    words_path.write_text(json.dumps(all_words, indent=2))
    print(f"Wrote word timings → {words_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 pipeline/generate_audio.py <video-id>")
    asyncio.run(main(sys.argv[1]))
