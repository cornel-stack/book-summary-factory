import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { handPart, capsule, type HandPose } from "./drawing/cast";
import { CastStatic } from "./components/CastFigure";

const W = 1920;
const H = 1080;

/** A single hand pose, large, with a short forearm stub for context. */
const BigHand: React.FC<{ pose: HandPose; x: number; y: number; s: number }> = ({ pose, x, y, s }) => (
  <g>
    <path d={capsule([x - 64, y], [x, y], 15, 8)} fill={COLORS.ink} />
    <path d={handPart(pose, [x, y], [x - 64, y], s)} fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={0.5} />
  </g>
);

export const CastGestureSheet: React.FC = () => {
  const poses: HandPose[] = ["open", "point", "fist", "holding", "wave"];
  const colX = [300, 620, 940, 1260, 1580];
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <text x={80} y={70} fontFamily={FONTS.heading} fontSize={54} fill={COLORS.ink}>
          The Cast · Hands &amp; Gestures
        </text>

        {/* row 1: each hand pose, large */}
        {poses.map((p, i) => (
          <React.Fragment key={p}>
            <BigHand pose={p} x={colX[i]!} y={230} s={3.8} />
            <text x={colX[i]!} y={360} textAnchor="middle" fontFamily={FONTS.label} fontSize={34} fill={COLORS.flame}>
              {p}
            </text>
          </React.Fragment>
        ))}

        {/* row 2: gesture close-ups */}
        <text x={W / 2} y={470} textAnchor="middle" fontFamily={FONTS.label} fontSize={30} fill={COLORS.inkSoft}>
          gestures in context
        </text>
        <CastStatic id="alex" pose="pointing" expression="happy" cx={420} feetY={1020} base={1.5} />
        <text x={420} y={1055} textAnchor="middle" fontFamily={FONTS.label} fontSize={30} fill={COLORS.inkSoft}>point</text>

        <CastStatic id="sage" pose="presenting" expression="happy" cx={960} feetY={1020} base={1.5} />
        <text x={960} y={1055} textAnchor="middle" fontFamily={FONTS.label} fontSize={30} fill={COLORS.inkSoft}>present</text>

        {/* holding a book: the book is gripped at the hand anchor */}
        <CastStatic id="maya" pose="presenting" expression="happy" holding={{ prop: "book", hand: "right" }} cx={1480} feetY={1020} base={1.5} />
        <text x={1480} y={1055} textAnchor="middle" fontFamily={FONTS.label} fontSize={30} fill={COLORS.inkSoft}>hold a book</text>
      </svg>
    </AbsoluteFill>
  );
};
