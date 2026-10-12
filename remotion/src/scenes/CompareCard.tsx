import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CHART_COLORS, COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { QuietBackdrop } from "../components/QuietBackdrop";
import { syncStartFrame } from "../drawing/layout";
import type { WordTiming } from "../schema";

type Item = { label: string; sync?: { phrase: string } };
type Column = { heading: string; items: Item[] };

/** Animated 2-column comparison / mini-table (Phase 16). Headings fade, a center
 *  divider + "vs" badge pop, then rows spring in column-by-column. */
export const CompareCard: React.FC<{
  visual: { title?: string; left: Column; right: Column };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const { left, right } = visual;

  const rows = Math.max(left.items.length, right.items.length);
  const topY = visual.title ? 340 : 270;
  const headY = topY - 110;
  const step = Math.min(170, (VIDEO.height - topY - 150) / rows);
  const gap = 90;
  const colW = (VIDEO.width - 2 * LAYOUT.safeMargin - gap) / 2;
  const leftX = LAYOUT.safeMargin;
  const rightX = LAYOUT.safeMargin + colW + gap;
  const midX = VIDEO.width / 2;
  const rightColor = CHART_COLORS[0]!;

  const fade = (f0: number) => interpolate(frame, [f0, f0 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = fade(4);
  const vsPop = spring({ frame: frame - 14, fps, config: { damping: 11, stiffness: 170, mass: 0.6 } });

  const column = (col: Column, x: number, color: string) =>
    col.items.map((item, i) => {
      const start = item.sync ? syncStartFrame(words, item.sync, fps, 24 + i * 12) : 24 + i * 12;
      const t = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 150, mass: 0.7 } });
      const op = interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      if (op <= 0) return null;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: topY + i * step,
            width: colW,
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: op,
            transform: `translateY(${(1 - t) * 26}px)`,
          }}
        >
          <div style={{ width: 20, height: 20, flex: "0 0 auto", borderRadius: "50%", background: color }} />
          <div style={{ fontFamily: FONTS.body, fontWeight: 700, fontSize: 60, color: COLORS.ink }}>{item.label}</div>
        </div>
      );
    });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <QuietBackdrop />
      {visual.title && (
        <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", fontFamily: FONTS.heading, fontSize: LAYOUT.titleSize * 0.7, color: COLORS.ink, opacity: titleOpacity }}>
          {visual.title}
        </div>
      )}

      {/* center divider */}
      <div style={{ position: "absolute", left: midX - 2, top: headY, width: 4, height: VIDEO.height - headY - 140, background: COLORS.inkSoft, opacity: 0.25 * fade(12) }} />

      {/* column headings */}
      <div style={{ position: "absolute", left: leftX, top: headY, width: colW, textAlign: "center", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 76, color: brand.accent, opacity: fade(8) }}>{left.heading}</div>
      <div style={{ position: "absolute", left: rightX, top: headY, width: colW, textAlign: "center", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 76, color: rightColor, opacity: fade(8) }}>{right.heading}</div>

      {/* vs badge */}
      <div style={{ position: "absolute", left: midX - 52, top: headY + 4, width: 104, height: 104, borderRadius: "50%", background: brand.paper, border: `6px solid ${COLORS.ink}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${Math.max(0.01, Math.min(1.08, vsPop))})` }}>
        <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 48, color: COLORS.ink }}>vs</span>
      </div>

      {column(left, leftX, brand.accent)}
      {column(right, rightX, rightColor)}
    </AbsoluteFill>
  );
};
