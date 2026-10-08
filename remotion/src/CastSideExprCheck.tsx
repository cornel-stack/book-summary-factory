import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import type { Expression } from "./drawing/character";
import { CastStatic } from "./components/CastFigure";

// Internal dev check: all 7 expressions in SIDE profile (Alex + Sage).
const EXPRS: Expression[] = ["neutral", "happy", "worried", "shocked", "angry", "tired", "curious"];

export const CastSideExprCheck: React.FC = () => {
  const colX = EXPRS.map((_, i) => 180 + i * 250);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <text x={80} y={60} fontFamily={FONTS.heading} fontSize={48} fill={COLORS.ink}>
          Profile expressions (dev check)
        </text>
        {EXPRS.map((e, i) => (
          <text key={e} x={colX[i]!} y={140} textAnchor="middle" fontFamily={FONTS.label} fontSize={28} fill={COLORS.flame}>
            {e}
          </text>
        ))}
        {EXPRS.map((e, i) => (
          <CastStatic key={`a${e}`} id="alex" pose="standing" view="side" expression={e} seat="none" cx={colX[i]!} feetY={480} base={0.78} />
        ))}
        {EXPRS.map((e, i) => (
          <CastStatic key={`s${e}`} id="sage" pose="standing" view="side" expression={e} seat="none" cx={colX[i]!} feetY={900} base={0.78} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
