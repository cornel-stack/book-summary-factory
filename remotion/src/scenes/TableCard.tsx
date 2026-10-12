import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CHART_COLORS, COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { QuietBackdrop } from "../components/QuietBackdrop";
import { syncStartFrame } from "../drawing/layout";
import type { WordTiming } from "../schema";

type Row = { cells: string[]; sync?: { phrase: string }; highlight?: boolean };

/**
 * A general NxM data table (Phase 17). The header row fades in, then each data
 * row springs in one at a time (sync-driven when phrases are tagged). The first
 * cell of each row is its label (left-aligned); the rest are values (centered).
 * A highlighted row gets a flame tint so the key takeaway pops.
 */
export const TableCard: React.FC<{
  visual: { title?: string; columns: string[]; rows: Row[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const { columns, rows } = visual;

  const nCols = columns.length;
  const topY = visual.title ? 300 : 230;
  const headH = 110;
  const availH = VIDEO.height - topY - 170;
  const rowH = Math.min(150, availH / rows.length);
  const tableW = VIDEO.width - 2 * LAYOUT.safeMargin;
  const x0 = LAYOUT.safeMargin;
  // first (label) column is a touch wider than the value columns
  const labelW = tableW * (nCols === 2 ? 0.5 : 0.4);
  const valW = (tableW - labelW) / (nCols - 1);
  const colX = (c: number) => (c === 0 ? x0 : x0 + labelW + (c - 1) * valW);
  const colW = (c: number) => (c === 0 ? labelW : valW);

  const fade = (f0: number) => interpolate(frame, [f0, f0 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = fade(4);

  const cellStyle = (c: number): React.CSSProperties => ({
    position: "absolute",
    left: colX(c) + (c === 0 ? 28 : 0),
    width: colW(c) - (c === 0 ? 40 : 0),
    textAlign: c === 0 ? "left" : "center",
    fontFamily: c === 0 ? FONTS.body : FONTS.heading,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: c === 0 ? "flex-start" : "center",
    height: "100%",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <QuietBackdrop />
      {visual.title && (
        <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", fontFamily: FONTS.heading, fontSize: LAYOUT.titleSize * 0.7, color: COLORS.ink, opacity: titleOpacity }}>
          {visual.title}
        </div>
      )}

      {/* header band */}
      <div
        style={{
          position: "absolute",
          left: x0,
          top: topY,
          width: tableW,
          height: headH,
          background: COLORS.ink,
          borderRadius: 14,
          opacity: fade(8),
        }}
      >
        {columns.map((h, c) => (
          <div key={c} style={{ ...cellStyle(c), top: 0, fontSize: 52, color: brand.paper, fontFamily: FONTS.heading }}>
            {h}
          </div>
        ))}
      </div>

      {/* data rows */}
      {rows.map((row, i) => {
        const start = row.sync ? syncStartFrame(words, row.sync, fps, 22 + i * 12) : 22 + i * 12;
        const t = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 150, mass: 0.7 } });
        const op = interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (op <= 0) return null;
        const y = topY + headH + 14 + i * rowH;
        const accent = CHART_COLORS[i % CHART_COLORS.length]!;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0,
              top: y,
              width: tableW,
              height: rowH - 12,
              background: row.highlight ? COLORS.flameSoft : i % 2 === 0 ? "rgba(28,26,23,0.04)" : "transparent",
              border: row.highlight ? `4px solid ${COLORS.flame}` : "none",
              borderRadius: 12,
              opacity: op,
              transform: `translateX(${(1 - t) * -40}px)`,
            }}
          >
            {/* left accent chip on the row label */}
            <div style={{ position: "absolute", left: 10, top: "50%", width: 10, height: rowH * 0.5, transform: "translateY(-50%)", borderRadius: 6, background: accent }} />
            {row.cells.map((cell, c) => (
              <div key={c} style={{ ...cellStyle(c), top: 0, fontSize: c === 0 ? 50 : 56, color: COLORS.ink }}>
                {cell}
              </div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
