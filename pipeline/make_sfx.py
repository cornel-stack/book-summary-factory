"""
Synthesize the shorts/longform sound-effect kit into remotion/public/sfx/
(stdlib only — no samples, no licensing). Re-run to regenerate:

    python pipeline/make_sfx.py

Kit: whoosh1-3 (scene transitions), pop1-3 (icon/word entries), click
(subscribe press), ding (bell / stat landing), impact (hook slam), riser
(build into a reveal). Variants rotate so viewers don't tune them out.
"""
import math
import random
import struct
import wave
from pathlib import Path

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "remotion" / "public" / "sfx"


def write(name: str, samples: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.89 / peak
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * gain)) * 32767)) for s in samples))


def env(i: int, n: int, attack: float, curve: float = 2.0) -> float:
    t = i / n
    a = min(1.0, t / attack) if attack > 0 else 1.0
    return a * (1 - t) ** curve


def whoosh(seed: int, dur: float, f0: float, f1: float) -> list[float]:
    """Band-swept noise: a one-pole low-pass whose cutoff sweeps f0→f1→f0."""
    rnd = random.Random(seed)
    n = int(SR * dur)
    out, lp, lp2 = [], 0.0, 0.0
    for i in range(n):
        t = i / n
        fc = f0 + (f1 - f0) * math.sin(math.pi * t)
        a = 1 - math.exp(-2 * math.pi * fc / SR)
        x = rnd.uniform(-1, 1)
        lp += a * (x - lp)
        lp2 += a * (lp - lp2)
        out.append((lp - lp2 * 0.6) * math.sin(math.pi * t) ** 1.5)
    return out


def pop(f_start: float, f_end: float, dur: float) -> list[float]:
    n = int(SR * dur)
    out, ph = [], 0.0
    for i in range(n):
        t = i / n
        f = f_end + (f_start - f_end) * (1 - t) ** 3
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * env(i, n, 0.02, 3))
    return out


def click() -> list[float]:
    rnd = random.Random(7)
    n = int(SR * 0.06)
    return [(rnd.uniform(-1, 1) * 0.5 + math.sin(2 * math.pi * 2200 * i / SR)) * env(i, n, 0.005, 6) for i in range(n)]


def ding() -> list[float]:
    n = int(SR * 0.9)
    partials = [(1318.5, 1.0), (2637.0, 0.4), (3955.5, 0.15)]
    return [sum(a * math.sin(2 * math.pi * f * i / SR) for f, a in partials) * env(i, n, 0.004, 3.5) for i in range(n)]


def impact() -> list[float]:
    rnd = random.Random(3)
    n = int(SR * 0.55)
    out, ph, lp = [], 0.0, 0.0
    for i in range(n):
        t = i / n
        f = 40 + 110 * (1 - t) ** 4
        ph += 2 * math.pi * f / SR
        lp += 0.08 * (rnd.uniform(-1, 1) - lp)
        out.append((math.sin(ph) * 1.0 + lp * 2.0 * (1 - t) ** 8) * env(i, n, 0.003, 2.2))
    return out


def riser() -> list[float]:
    rnd = random.Random(11)
    n = int(SR * 1.2)
    out, lp, ph = [], 0.0, 0.0
    for i in range(n):
        t = i / n
        fc = 300 + 5000 * t**2
        a = 1 - math.exp(-2 * math.pi * fc / SR)
        lp += a * (rnd.uniform(-1, 1) - lp)
        ph += 2 * math.pi * (220 + 660 * t**2) / SR
        out.append((lp * 0.7 + math.sin(ph) * 0.25) * t**2 * (1 - max(0, t - 0.97) / 0.03))
    return out


if __name__ == "__main__":
    write("whoosh1", whoosh(1, 0.42, 400, 3800))
    write("whoosh2", whoosh(2, 0.36, 600, 5200))
    write("whoosh3", whoosh(3, 0.5, 300, 2800))
    write("pop1", pop(900, 380, 0.11))
    write("pop2", pop(1200, 520, 0.09))
    write("pop3", pop(700, 300, 0.13))
    write("click", click())
    write("ding", ding())
    write("impact", impact())
    write("riser", riser())
    print(f"wrote SFX kit -> {OUT}")
