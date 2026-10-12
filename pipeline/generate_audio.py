#!/usr/bin/env python3
"""
Step 1 of the audio-first pipeline.

Input : content/videos/<video-id>.json
Output: - remotion/public/assets/<video-id>/<scene-id>.mp3   (one per scene)
        - .build/<video-id>/words.json                       (per-scene word timings)

Narration audio is the source of truth for all downstream timing. Every provider
MUST return per-WORD timestamps (seconds) so captions + animation sync can be
aligned to the spoken word.

TTS is PROVIDER-PLUGGABLE for resilience (edge-tts periodically 403s globally):
  - "edge"   : free Microsoft Edge read-aloud neural voices. No key. WordBoundary
               events give word timings. Default primary — but unreliable + its
               commercial-use terms are a gray area.
  - "azure"  : official Azure Cognitive Services Speech. SAME neural voices +
               native word-boundary events. Needs AZURE_SPEECH_KEY (+ _REGION).
               Free tier 0.5M chars/month. Reliable, commercial-licensed.
  - "kokoro" : Kokoro-82M, OFFLINE + free-forever + Apache-2.0 (commercial-safe),
               no key/quota. Native per-word timestamps. Default voice af_heart
               (KOKORO_VOICE). CPU-bound (~real time). pip install -r
               requirements-kokoro.txt.

Selection (env TTS_PROVIDER, default "auto"):
  auto   — probe edge once; if up use edge; else Azure (if key'd); else Kokoro
           (if installed); else exit with guidance.
  edge   — force edge (fail if unavailable).
  azure  — force azure (fail if no key).
  kokoro — force the offline Kokoro voice.

Every provider returns the IDENTICAL per-word timing contract, so sync/captions
are unaffected by which one runs.

Env:
  TTS_PROVIDER        auto | edge | azure | kokoro   (default auto)
  AZURE_SPEECH_KEY    Azure Speech resource key      (required for azure)
  AZURE_SPEECH_REGION Azure region, e.g. eastus      (default eastus)
  KOKORO_VOICE        Kokoro voice id                (default af_heart)
  AUDIO_CONCURRENCY   parallel scene synths          (default 6; azure 3; kokoro 1)

Usage: python3 pipeline/generate_audio.py <video-id>
"""
import asyncio
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

import edge_tts

REPO = Path(__file__).resolve().parent.parent
TICKS_PER_SECOND = 10_000_000  # TTS offsets/durations are in 100ns ticks

AUDIO_CONCURRENCY = int(os.environ.get("AUDIO_CONCURRENCY", "6"))
PROVIDER = os.environ.get("TTS_PROVIDER", "auto").lower()
AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY")
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION", "eastus")
# Kokoro-82M (offline, Apache-2.0, free forever). af_heart is its flagship
# (grade A) voice. Override with KOKORO_VOICE or a kokoro-style `voice` field.
KOKORO_VOICE = os.environ.get("KOKORO_VOICE", "af_heart")

# Channel-wide narration pace. The neural voices default to ~180 wpm, which is
# too brisk for a book summary; -18% lands a measured ~150 wpm. Override per
# script with a top-level "rate" field.
DEFAULT_RATE = "-18%"


# --------------------------------------------------------------------------- #
# Provider: edge-tts (free, no key, WordBoundary)                             #
# --------------------------------------------------------------------------- #
async def synth_edge(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    """Synthesize one scene to mp3 via edge-tts, returning per-word timings."""
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
                words.append({"text": chunk["text"], "start": round(start, 3), "end": round(end, 3)})
    return words


async def _edge_available() -> bool:
    """One tiny probe so `auto` can fail over to azure without flapping per scene."""
    try:
        c = edge_tts.Communicate("ready", "en-US-AndrewNeural", boundary="WordBoundary")
        async for chunk in c.stream():
            if chunk["type"] == "audio":
                return True
        return False
    except Exception as e:  # WSServerHandshakeError (403), network, etc.
        print(f"  edge-tts probe failed: {e.__class__.__name__}")
        return False


# --------------------------------------------------------------------------- #
# Provider: Azure Cognitive Services Speech (official, same voices, key'd)     #
# --------------------------------------------------------------------------- #
def _synth_azure_sync(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    """Synthesize one scene via the Azure Speech SDK. Writes PCM WAV then
    transcodes to mp3 with ffmpeg (avoids the SDK's GStreamer mp3 dependency on
    Linux). Word-boundary events give the per-word timings."""
    import azure.cognitiveservices.speech as speechsdk

    cfg = speechsdk.SpeechConfig(subscription=AZURE_KEY, region=AZURE_REGION)
    cfg.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
    )
    tmp_wav = out_mp3.with_suffix(".wav")
    audio_cfg = speechsdk.audio.AudioOutputConfig(filename=str(tmp_wav))
    synth = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=audio_cfg)

    words: list[dict] = []

    def on_word_boundary(evt) -> None:
        # Skip punctuation/sentence boundaries — keep real words only.
        try:
            if evt.boundary_type != speechsdk.SpeechSynthesisBoundaryType.Word:
                return
        except Exception:
            pass
        start = evt.audio_offset / TICKS_PER_SECOND
        dur = evt.duration
        dsec = dur.total_seconds() if hasattr(dur, "total_seconds") else float(dur) / TICKS_PER_SECOND
        words.append({"text": evt.text, "start": round(start, 3), "end": round(start + dsec, 3)})

    synth.synthesis_word_boundary.connect(on_word_boundary)

    # SSML carries the voice + prosody rate (matches edge's "-18%" convention).
    ssml = (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
        f'<voice name="{voice}"><prosody rate="{rate}">{escape(text)}</prosody></voice></speak>'
    )
    result = synth.speak_ssml_async(ssml).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detail = ""
        if result.reason == speechsdk.ResultReason.Canceled:
            c = result.cancellation_details
            detail = f" — {c.reason}: {c.error_details}"
        raise RuntimeError(f"Azure synth failed ({result.reason}){detail}")

    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp_wav), "-codec:a", "libmp3lame", "-q:a", "4", str(out_mp3)],
        check=True,
        capture_output=True,
    )
    tmp_wav.unlink(missing_ok=True)
    words.sort(key=lambda w: w["start"])
    return words


async def synth_azure(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    # The Azure SDK is synchronous + blocking; run it off the event loop.
    return await asyncio.to_thread(_synth_azure_sync, text, voice, rate, out_mp3)


# --------------------------------------------------------------------------- #
# Provider: Kokoro-82M (offline, free-forever, Apache-2.0, native word times)  #
# --------------------------------------------------------------------------- #
_KOKORO_PIPE = None


def _kokoro_pipeline():
    global _KOKORO_PIPE
    if _KOKORO_PIPE is None:
        from kokoro import KPipeline

        _KOKORO_PIPE = KPipeline(lang_code="a")  # American English
    return _KOKORO_PIPE


def _kokoro_available() -> bool:
    try:
        import kokoro  # noqa: F401
        import numpy  # noqa: F401
        import soundfile  # noqa: F401

        return True
    except Exception:
        return False


def _rate_to_speed(rate: str) -> float:
    """edge/azure use "-18%"; Kokoro takes a speed multiplier (1.0 = normal)."""
    try:
        r = str(rate).strip()
        return max(0.5, min(2.0, 1.0 + float(r[:-1]) / 100.0)) if r.endswith("%") else float(r)
    except Exception:
        return 1.0


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def _align_words(narration: str, native: list[dict], duration: float) -> list[dict]:
    """The canonical token list is the NARRATION's own words. Use Kokoro's native
    per-word timestamps where they match (in order); interpolate any gaps so
    EVERY narration word gets a timing. This keeps the sync/caption contract
    robust even if Kokoro drops a token on a phoneme/word mismatch."""
    words = narration.split()
    n = len(words)
    if n == 0:
        return []
    ts: list[tuple[float, float] | None] = [None] * n
    j = 0
    for i, w in enumerate(words):
        wn = _norm(w)
        if not wn:
            continue
        k = j
        while k < len(native) and k <= j + 4:
            if _norm(native[k].get("text", "")) == wn:
                ts[i] = (float(native[k]["start"]), float(native[k]["end"]))
                j = k + 1
                break
            k += 1
    known = [(i, ts[i][0], ts[i][1]) for i in range(n) if ts[i]]
    if not known:
        per = (duration or n * 0.3) / n
        return [{"text": words[i], "start": round(i * per, 3), "end": round((i + 1) * per, 3)} for i in range(n)]
    out: list[dict] = []
    for i, w in enumerate(words):
        if ts[i]:
            s, e = ts[i]
        else:
            prev = [k for k in known if k[0] < i]
            nxt = [k for k in known if k[0] > i]
            if prev and nxt:
                p, q = prev[-1], nxt[0]
                span = q[0] - p[0]
                s = p[2] + (i - p[0]) / span * (q[1] - p[2])
                e = s + max(0.08, (q[1] - p[2]) / span * 0.8)
            elif prev:
                s = prev[-1][2] + 0.03
                e = s + 0.22
            else:
                q = nxt[0]
                e = max(0.1, q[1])
                s = max(0.0, e - 0.22)
        out.append({"text": w, "start": round(float(s), 3), "end": round(float(e), 3)})
    return out


def _synth_kokoro_sync(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    import numpy as np
    import soundfile as sf

    pipe = _kokoro_pipeline()
    speed = _rate_to_speed(rate)
    SR = 24000
    parts: list = []
    native: list[dict] = []
    offset = 0.0  # cumulative audio seconds (timestamps are per-chunk)
    for r in pipe(text, voice=voice, speed=speed):
        a = r.audio
        if a is None:
            continue
        a = a.detach().cpu().numpy() if hasattr(a, "detach") else np.asarray(a, dtype="float32")
        for t in r.tokens or []:
            st, en = getattr(t, "start_ts", None), getattr(t, "end_ts", None)
            txt = (t.text or "").strip()
            if st is None or en is None or not txt:
                continue
            native.append({"text": txt, "start": offset + float(st), "end": offset + float(en)})
        parts.append(a)
        offset += len(a) / SR
    if not parts:
        raise RuntimeError("Kokoro produced no audio")
    full = np.concatenate(parts) if len(parts) > 1 else parts[0]
    tmp_wav = out_mp3.with_suffix(".wav")
    sf.write(str(tmp_wav), full, SR)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(tmp_wav), "-codec:a", "libmp3lame", "-q:a", "4", str(out_mp3)],
        check=True,
        capture_output=True,
    )
    tmp_wav.unlink(missing_ok=True)
    return _align_words(text, native, offset)


async def synth_kokoro(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    # Kokoro inference is synchronous + CPU-bound; run it off the event loop.
    return await asyncio.to_thread(_synth_kokoro_sync, text, voice, rate, out_mp3)


# --------------------------------------------------------------------------- #
# Provider selection                                                          #
# --------------------------------------------------------------------------- #
async def select_provider() -> tuple[str, callable, int]:
    """Resolve (name, synth-fn, concurrency) from TTS_PROVIDER + availability."""
    if PROVIDER == "edge":
        return "edge", synth_edge, AUDIO_CONCURRENCY
    if PROVIDER == "azure":
        if not AZURE_KEY:
            sys.exit("ERROR: TTS_PROVIDER=azure but AZURE_SPEECH_KEY is not set.")
        return "azure", synth_azure, min(AUDIO_CONCURRENCY, 3)
    if PROVIDER == "kokoro":
        if not _kokoro_available():
            sys.exit("ERROR: TTS_PROVIDER=kokoro but kokoro is not installed (pip install -r requirements-kokoro.txt).")
        return "kokoro", synth_kokoro, 1  # CPU-bound; serialize
    # auto: free edge when it's up → Azure (if key'd) → offline Kokoro (keyless).
    if await _edge_available():
        return "edge", synth_edge, AUDIO_CONCURRENCY
    if AZURE_KEY:
        print("⚠ edge-tts unavailable — falling back to Azure Speech.")
        return "azure", synth_azure, min(AUDIO_CONCURRENCY, 3)
    if _kokoro_available():
        print("⚠ edge-tts unavailable — falling back to Kokoro (offline, free).")
        return "kokoro", synth_kokoro, 1
    sys.exit(
        "ERROR: edge-tts is unavailable (likely a global 403) and no fallback is configured.\n"
        "  Fix one of:\n"
        "    • set AZURE_SPEECH_KEY (+ AZURE_SPEECH_REGION) to fall back to Azure Speech, or\n"
        "    • pip install -r requirements-kokoro.txt for the offline Kokoro fallback, or\n"
        "    • retry later once edge-tts recovers (TTS_PROVIDER=edge to force it).\n"
    )


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

    provider_name, synth, concurrency = await select_provider()
    # Kokoro uses its own voice names (af_heart, am_michael, …), not the
    # edge/azure voice field. Honor a kokoro-style voice if the script sets one.
    if provider_name == "kokoro" and not re.match(r"^[ab][fm]_\w+", voice or ""):
        voice = KOKORO_VOICE
    print(f"TTS provider: {provider_name} (voice {voice}, rate {rate})")

    sem = asyncio.Semaphore(concurrency)
    done = 0
    total = len(scenes)

    async def worker(scene: dict) -> tuple[str, list[dict]]:
        nonlocal done
        sid = scene["id"]
        narration = scene["narration"].strip()
        out_mp3 = audio_dir / f"{sid}.mp3"
        async with sem:
            words = await synth(narration, voice, rate, out_mp3)
        if not out_mp3.exists() or out_mp3.stat().st_size == 0:
            sys.exit(f"ERROR: no audio produced for scene '{sid}'")
        done += 1
        print(
            f"  [{done}/{total}] {sid}: {out_mp3.name} "
            f"({out_mp3.stat().st_size} bytes, {len(words)} words, rate {rate})"
        )
        return sid, words

    print(f"Synthesizing {total} scenes with concurrency {concurrency}…")
    results = await asyncio.gather(*(worker(s) for s in scenes))

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
