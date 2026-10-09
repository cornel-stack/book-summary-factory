import React from "react";
import { COLORS, FONTS } from "../theme";
import { useBrand } from "../brand";
import type { WordTiming } from "../schema";

/**
 * Burned-in captions for shorts, driven by the per-scene word timestamps.
 * Words are grouped into short lines; the line containing the current spoken
 * word is shown on a paper chip in the safe zone. The CURRENT word gets the
 * brand's caption treatment — a translucent wash behind it plus a colored tick
 * at the caption line's left edge — mirroring each app's sentence-sync motif
 * (ReadLark: amber wash + coral tick; PerCuriam: amber wash + navy tick).
 */
type Line = { words: WordTiming[]; start: number; end: number };

function groupLines(words: WordTiming[], maxWords = 5, maxChars = 24): Line[] {
  const lines: Line[] = [];
  let cur: WordTiming[] = [];
  const flush = () => {
    if (cur.length) lines.push({ words: cur, start: cur[0]!.start, end: cur[cur.length - 1]!.end });
    cur = [];
  };
  for (const w of words) {
    const candidate = [...cur, w].map((x) => x.text).join(" ");
    if (cur.length >= maxWords || candidate.length > maxChars) flush();
    cur.push(w);
  }
  flush();
  return lines;
}

export const BurnedCaptions: React.FC<{
  words: WordTiming[];
  frame: number; // scene-local frame
  fps: number;
  bottom: number; // px from top where the caption rail begins (safe-zone top)
  width: number;
}> = ({ words, frame, fps, bottom, width }) => {
  const brand = useBrand();
  if (!words.length) return null;
  const lines = groupLines(words);
  const t = frame / fps;
  // active line = the one whose span contains t, else the most recent one started.
  let active = lines.find((l) => t >= l.start && t <= l.end);
  if (!active) {
    const started = lines.filter((l) => l.start <= t);
    active = started.length ? started[started.length - 1] : lines[0];
  }
  if (!active) return null;
  const curIdx = (() => {
    for (let i = active.words.length - 1; i >= 0; i--) if (active.words[i]!.start <= t) return i;
    return 0;
  })();

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: bottom - 150,
        width,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: width - 140,
          background: brand.paper,
          borderRadius: 20,
          padding: "18px 30px 18px 36px",
          boxShadow: "0 8px 0 rgba(28,26,23,0.10)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0 14px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* left-edge tick — the sentence-sync motif */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 14,
            bottom: 14,
            width: 6,
            borderRadius: 3,
            background: brand.caption.tick,
          }}
        />
        {active.words.map((w, i) => {
          const isCur = i === curIdx;
          return (
            <span
              key={i}
              style={{
                fontFamily: FONTS.body,
                fontWeight: 800,
                fontSize: 60,
                lineHeight: 1.12,
                color: COLORS.ink,
                padding: "0 8px",
                borderRadius: 10,
                background: isCur
                  ? hexWithAlpha(brand.caption.wash, brand.caption.washOpacity)
                  : "transparent",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** #RRGGBB + alpha(0–1) → #RRGGBBAA */
function hexWithAlpha(hex: string, a: number): string {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${aa}`;
}
