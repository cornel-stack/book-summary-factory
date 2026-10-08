import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { stageShapes, GROUND_Y, type StageName } from "./drawing/stage";
import { CAST, castFigureRender, type CastId } from "./drawing/cast";
import { fillColor } from "./components/CastFigure";

const STAGES: { name: StageName; who: CastId }[] = [
  { name: "plain", who: "alex" },
  { name: "outdoor", who: "maya" },
  { name: "room", who: "sage" },
  { name: "desk-office", who: "alex" },
  { name: "street", who: "max" },
  { name: "stage-spotlight", who: "sage" },
];

/** One stage drawn full-frame-scaled into a cell, with a cast figure for scale. */
const Cell: React.FC<{ name: StageName; who: CastId; x: number; y: number; s: number }> = ({ name, who, x, y, s }) => {
  const shapes = stageShapes(name);
  // figure: feet on GROUND_Y+45, centered
  const r = castFigureRender(CAST[who], "standing", {});
  const fscale = 2.6 * CAST[who].heightScale;
  const fx = 960 - 50 * fscale;
  const fy = GROUND_Y + 52 - 192 * fscale;
  const sw = 2 / fscale;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={0} y={0} width={1920} height={1080} fill={COLORS.paper} />
      {shapes.map((sh, i) => (
        <path key={i} d={sh.d} fill={sh.fill ?? "none"} fillRule="evenodd" stroke={sh.stroke ?? "none"} strokeWidth={sh.sw ?? 0} strokeLinecap="round" opacity={sh.opacity ?? 1} />
      ))}
      <g transform={`translate(${fx} ${fy}) scale(${fscale})`}>
        {r.fills.map((p, i) => (
          <path key={i} d={p.d} fill={fillColor(p.fill)} fillRule="evenodd" stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {r.face.map((d, i) => (
          <path key={`f${i}`} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw * 1.4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
      <rect x={0} y={0} width={1920} height={1080} fill="none" stroke={COLORS.inkSoft} strokeWidth={4} opacity={0.4} />
    </g>
  );
};

export const StageSheet: React.FC = () => {
  const cw = 1920 / 2;
  const ch = 1080 / 3;
  const s = cw / 1920;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {STAGES.map((st, i) => {
          const x = (i % 2) * cw;
          const y = Math.floor(i / 2) * ch;
          return (
            <React.Fragment key={st.name}>
              <Cell name={st.name} who={st.who} x={x} y={y} s={s} />
              <text x={x + 16} y={y + 34} fontFamily={FONTS.label} fontSize={26} fill={COLORS.flame}>{st.name}</text>
            </React.Fragment>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
