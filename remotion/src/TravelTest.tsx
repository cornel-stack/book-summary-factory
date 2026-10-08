import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "./theme";
import { DrawingBoard } from "./components/DrawingBoard";
import type { BoardElement } from "./drawing/types";

// Dev harness for the hand-travel fix: element A (left) draws immediately;
// element B (far right) is forced to start late (as a sync'd element would),
// leaving a long idle gap. Watch the hand between A's end and B's start.
const circle = (cx: number, cy: number, r: number) =>
  `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;

export const TravelTest: React.FC = () => {
  const elements: BoardElement[] = [
    {
      key: "A",
      shape: { viewBox: { w: 100, h: 100 }, strokes: [circle(50, 50, 40), `M 30 50 L 70 50`] },
      box: { x: 180, y: 430, w: 220, h: 220 },
      startFrame: 0,
      strokeColor: COLORS.ink,
      strokeWidth: 6,
    },
    {
      key: "B",
      shape: { viewBox: { w: 100, h: 100 }, strokes: [circle(50, 50, 40), `M 30 50 L 70 50`] },
      box: { x: 1520, y: 430, w: 220, h: 220 },
      startFrame: 90, // forced late, like a sync'd element far across the frame
      strokeColor: COLORS.flame,
      strokeWidth: 6,
    },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <DrawingBoard elements={elements} />
    </AbsoluteFill>
  );
};
