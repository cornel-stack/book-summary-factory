import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { CAST, type CastId } from "./drawing/cast";
import { STICK_POSES } from "./schema";
import type { StickPose } from "./drawing/stick";
import { CastStatic } from "./components/CastFigure";

// Internal check: all 5 cast members × all 11 poses, to verify anatomy.
const IDS: CastId[] = ["alex", "sage", "max", "maya", "pip"];

export const CastCheckSheet: React.FC = () => {
  const poses = STICK_POSES as readonly StickPose[];
  const colW = 1920 / (poses.length + 0.5);
  const rowH = (1080 - 60) / IDS.length;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {poses.map((p, c) => (
          <text key={p} x={colW * (c + 1)} y={46} textAnchor="middle" fontFamily={FONTS.label} fontSize={20} fill={COLORS.flame}>
            {p}
          </text>
        ))}
        {IDS.map((id, r) => {
          const feetY = 70 + rowH * (r + 1) - 14;
          return (
            <React.Fragment key={id}>
              <text x={40} y={feetY - rowH * 0.5} fontFamily={FONTS.label} fontSize={22} fill={COLORS.ink}>
                {CAST[id].name}
              </text>
              {poses.map((p, c) => (
                <CastStatic key={p} id={id} pose={p} expression="happy" cx={colW * (c + 1)} feetY={feetY} base={0.42} />
              ))}
            </React.Fragment>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
