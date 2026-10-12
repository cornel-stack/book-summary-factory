import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { CAST, type CastId } from "./drawing/cast";
import { STICK_POSES } from "./schema";
import type { StickPose } from "./drawing/stick";
import { CastStatic } from "./components/CastFigure";

// Internal check: EVERY cast member × all poses, to verify anatomy (hands, skin).
const IDS: CastId[] = Object.keys(CAST) as CastId[];

// A focused, LARGE check: the hand-critical poses across a diverse subset, so
// the skin-toned hands are big enough to eyeball.
const CHECK_POSES: StickPose[] = ["standing", "pointing", "presenting", "celebrating", "panicking", "thinking", "walking"];
const CHECK_IDS: CastId[] = ["alex", "jade", "omar", "theo", "nadia", "kwame"];

export const CastCheckSheet: React.FC = () => {
  const poses = CHECK_POSES;
  const colW = 1920 / (poses.length + 0.5);
  const rowH = (1080 - 70) / CHECK_IDS.length;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {poses.map((p, c) => (
          <text key={p} x={colW * (c + 1)} y={46} textAnchor="middle" fontFamily={FONTS.label} fontSize={28} fill={COLORS.flame}>
            {p}
          </text>
        ))}
        {CHECK_IDS.map((id, r) => {
          const feetY = 90 + rowH * (r + 1) - 20;
          return (
            <React.Fragment key={id}>
              <text x={30} y={feetY - rowH * 0.5} fontFamily={FONTS.label} fontSize={26} fill={COLORS.ink}>
                {CAST[id].name}
              </text>
              {poses.map((p, c) => (
                <CastStatic key={p} id={id} pose={p} expression="happy" cx={colW * (c + 1)} feetY={feetY} base={0.72} />
              ))}
            </React.Fragment>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
