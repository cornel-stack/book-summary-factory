import { QuietBackdrop } from "../components/QuietBackdrop";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { DrawingBoard } from "../components/DrawingBoard";
import { circlePath } from "../drawing/stick";
import { syncStartFrame } from "../drawing/layout";
import type { BoardElement, Shape } from "../drawing/types";
import type { WordTiming } from "../schema";

type Point = { label: string; value: number; sync?: { phrase: string } };

const full = (strokes: string[]): Shape => ({
  viewBox: { w: VIDEO.width, h: VIDEO.height },
  strokes,
});

export const StatChart: React.FC<{
  visual: { label: string; mode: "line" | "bars"; datapoints: Point[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const pts = visual.datapoints;

  // Chart area in scene px.
  const x0 = LAYOUT.safeMargin + 150;
  const x1 = VIDEO.width - LAYOUT.safeMargin;
  const y0 = LAYOUT.safeMargin + 160;
  const y1 = VIDEO.height - LAYOUT.safeMargin - 110;

  const values = pts.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = maxV === minV ? Math.max(1, Math.abs(maxV) * 0.2) : (maxV - minV) * 0.18;
  const lo = minV - pad;
  const hi = maxV + pad;
  const yFor = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
  const xFor = (i: number) => (pts.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (pts.length - 1));

  const elements: BoardElement[] = [];
  const fullBox = { x: 0, y: 0, w: VIDEO.width, h: VIDEO.height };

  // Axes (drawn first).
  elements.push({
    key: "axes",
    shape: full([`M ${x0} ${y0 - 20} L ${x0} ${y1}`, `M ${x0} ${y1} L ${x1 + 10} ${y1}`]),
    box: fullBox,
    startFrame: 0,
    strokeColor: COLORS.ink,
    strokeWidth: 5,
  });

  if (visual.mode === "bars") {
    const bw = Math.min(140, ((x1 - x0) / pts.length) * 0.5);
    pts.forEach((p, i) => {
      const cx = xFor(i);
      const top = yFor(p.value);
      elements.push({
        key: `bar-${i}`,
        shape: full([`M ${cx - bw / 2} ${y1} L ${cx - bw / 2} ${top} L ${cx + bw / 2} ${top} L ${cx + bw / 2} ${y1}`]),
        box: fullBox,
        startFrame: syncStartFrame(words, p.sync, fps, 0),
        strokeColor: COLORS.flame,
        strokeWidth: 6,
        label: String(p.value),
        labelAt: { x: cx, y: top - 48 },
        labelColor: COLORS.ink,
      });
    });
  } else {
    pts.forEach((p, i) => {
      const cx = xFor(i);
      const cy = yFor(p.value);
      const strokes: string[] = [];
      if (i > 0) strokes.push(`M ${xFor(i - 1)} ${yFor(pts[i - 1]!.value)} L ${cx} ${cy}`);
      strokes.push(circlePath(cx, cy, 9));
      elements.push({
        key: `pt-${i}`,
        shape: full(strokes),
        box: fullBox,
        startFrame: syncStartFrame(words, p.sync, fps, 0),
        strokeColor: COLORS.flame,
        strokeWidth: 7,
        label: String(p.value),
        labelAt: { x: cx, y: cy - 52 },
        labelColor: COLORS.ink,
      });
    });
  }

  const titleOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const axisLabelOpacity = interpolate(frame, [12, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <QuietBackdrop />
      <div
        style={{
          position: "absolute",
          top: 90,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontSize: LAYOUT.subtitleSize,
          color: COLORS.ink,
          opacity: titleOpacity,
        }}
      >
        {visual.label}
      </div>
      <DrawingBoard elements={elements} />
      {/* category labels under the x-axis */}
      {pts.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: xFor(i) - 120,
            top: y1 + 16,
            width: 240,
            textAlign: "center",
            fontFamily: FONTS.label,
            fontSize: LAYOUT.labelSize * 0.8,
            color: COLORS.inkSoft,
            opacity: axisLabelOpacity,
          }}
        >
          {p.label}
        </div>
      ))}
    </AbsoluteFill>
  );
};
