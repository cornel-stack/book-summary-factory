import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { CAST, type CastId } from "./drawing/cast";
import type { StickPose } from "./drawing/stick";
import type { Expression } from "./drawing/character";
import { CastStatic } from "./components/CastFigure";

const IDS: CastId[] = ["alex", "sage", "max", "maya", "pip"];
const W = 1920;
const H = 1080;

const Label: React.FC<{ x: number; y: number; text: string; size?: number; color?: string }> = ({
  x,
  y,
  text,
  size = 32,
  color = COLORS.inkSoft,
}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONTS.label} fontSize={size} fill={color}>
    {text}
  </text>
);

/** Page 1 — each cast member in 4 poses. */
export const CastSheetPoses: React.FC = () => {
  const poses: StickPose[] = ["standing", "pointing", "walking", "sitting"];
  const poseLabel = ["standing", "pointing", "walking", "sitting"];
  const colX = [470, 820, 1170, 1540];
  const rowFeet = [280, 450, 620, 790, 960];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <text x={80} y={70} fontFamily={FONTS.heading} fontSize={54} fill={COLORS.ink}>
          The Cast · Poses
        </text>
        {poses.map((p, c) => (
          <Label key={p} x={colX[c]!} y={120} text={poseLabel[c]!} size={30} color={COLORS.flame} />
        ))}
        {IDS.map((id, rI) => (
          <React.Fragment key={id}>
            <Label x={150} y={rowFeet[rI]! - 50} text={CAST[id].name} size={34} color={COLORS.ink} />
            {poses.map((p, c) => (
              <CastStatic key={p} id={id} pose={p} expression="happy" cx={colX[c]!} feetY={rowFeet[rI]!} base={0.82} />
            ))}
          </React.Fragment>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Page 2 — each cast member in 4 expressions, plus a silhouette lineup. */
export const CastSheetExpr: React.FC = () => {
  const exprs: Expression[] = ["happy", "worried", "shocked", "curious"];
  const colX = [470, 820, 1170, 1540];
  const rowFeet = [250, 400, 550, 700, 850];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <text x={80} y={66} fontFamily={FONTS.heading} fontSize={54} fill={COLORS.ink}>
          The Cast · Expressions &amp; Silhouettes
        </text>
        {exprs.map((e, c) => (
          <Label key={e} x={colX[c]!} y={112} text={e} size={30} color={COLORS.flame} />
        ))}
        {IDS.map((id, rI) => (
          <React.Fragment key={id}>
            <Label x={150} y={rowFeet[rI]! - 42} text={CAST[id].name} size={30} color={COLORS.ink} />
            {exprs.map((e, c) => (
              <CastStatic key={e} id={id} pose="standing" expression={e} cx={colX[c]!} feetY={rowFeet[rI]!} base={0.66} />
            ))}
          </React.Fragment>
        ))}
        {/* silhouette lineup */}
        <line x1={80} y1={905} x2={W - 80} y2={905} stroke={COLORS.inkSoft} strokeWidth={1} opacity={0.4} />
        <Label x={W / 2} y={945} text="silhouette test — identifiable with no face" size={28} />
        {IDS.map((id, i) => (
          <CastStatic key={id} id={id} pose="standing" expression="happy" silhouette cx={430 + i * 270} feetY={1060} base={0.62} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
