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
import sys
from pathlib import Path

import edge_tts

REPO = Path(__file__).resolve().parent.parent
TICKS_PER_SECOND = 10_000_000  # edge-tts offsets/durations are in 100ns ticks

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

    all_words: dict[str, list[dict]] = {}
    for i, scene in enumerate(scenes, 1):
        sid = scene["id"]
        narration = scene.get("narration", "").strip()
        if not narration:
            sys.exit(f"ERROR: scene '{sid}' has empty narration")
        out_mp3 = audio_dir / f"{sid}.mp3"
        print(f"  [{i}/{len(scenes)}] {sid}: synthesizing ({len(narration)} chars, rate {rate})…")
        words = await synth_scene(narration, voice, rate, out_mp3)
        if not out_mp3.exists() or out_mp3.stat().st_size == 0:
            sys.exit(f"ERROR: no audio produced for scene '{sid}'")
        all_words[sid] = words
        print(f"      → {out_mp3.name} ({out_mp3.stat().st_size} bytes, {len(words)} words)")

    words_path = build_dir / "words.json"
    words_path.write_text(json.dumps(all_words, indent=2))
    print(f"Wrote word timings → {words_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 pipeline/generate_audio.py <video-id>")
    asyncio.run(main(sys.argv[1]))
