import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS, CAST_WARDROBE } from "./theme";
import { CAST, type CastId } from "./drawing/cast";
import { CastStatic } from "./components/CastFigure";

const IDS: CastId[] = ["alex", "sage", "max", "maya", "pip"];

/** Torso-only (default) vs full-top wardrobe, side by side, for the producer. */
export const WardrobeCompare: React.FC = () => {
  const colX = [300, 620, 940, 1260, 1580];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <text x={70} y={56} fontFamily={FONTS.heading} fontSize={46} fill={COLORS.ink}>Wardrobe — torso-only (default) vs full-top</text>
        <text x={960} y={120} textAnchor="middle" fontFamily={FONTS.label} fontSize={30} fill={COLORS.flame}>TORSO-ONLY (ships) — arms stay ink</text>
        {IDS.map((id, i) => (
          <CastStatic key={`t${id}`} id={id} pose="standing" expression="happy" wardrobe="torso" cx={colX[i]!} feetY={520} base={0.78} />
        ))}
        {IDS.map((id, i) => (
          <text key={`tl${id}`} x={colX[i]!} y={560} textAnchor="middle" fontFamily={FONTS.label} fontSize={22} fill={COLORS.inkSoft}>{CAST[id].name} · {CAST_WARDROBE[id]}</text>
        ))}
        <line x1={70} y1={600} x2={1850} y2={600} stroke={COLORS.inkSoft} strokeWidth={1} opacity={0.3} />
        <text x={960} y={650} textAnchor="middle" fontFamily={FONTS.label} fontSize={30} fill={COLORS.flame}>FULL-TOP (variant) — sleeves colored too</text>
        {IDS.map((id, i) => (
          <CastStatic key={`f${id}`} id={id} pose="standing" expression="happy" wardrobe="full-top" cx={colX[i]!} feetY={1030} base={0.78} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
