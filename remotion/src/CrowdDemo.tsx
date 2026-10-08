import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS, SCENE_PALETTE } from "./theme";
import { stageShapes } from "./drawing/stage";
import { CastStatic } from "./components/CastFigure";
import { peepsHeadParts } from "./drawing/peepsHead";

/**
 * Crowd-tier demo: a cast member (cast v2, hand-drawn style) in front of a
 * background "audience" of whole Open Peeps heads — tinted to a single flat
 * tone at reduced opacity so they read as a crowd and never compete with the
 * cast. In production these wash/fade in (never drawn by the hand).
 */
const CROWD = [
  { hair: "Short", face: "Smile", x: 250 },
  { hair: "Bun", face: "Calm", x: 560 },
  { hair: "Bald", face: "Suspicious", x: 870 },
  { hair: "Short", face: "Awe", x: 1180 },
  { hair: "Bun", face: "Concerned", x: 1490 },
  { hair: "Bald", face: "Smile", x: 1760 },
];

const CrowdHead: React.FC<{ hair: string; face: string; x: number; y: number; s: number; tint: string }> = ({ hair, face, x, y, s, tint }) => {
  const parts = peepsHeadParts(hair, face);
  // mount: chin ~ (442,512) in head-local → (x, y)
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-442} ${-512})`} opacity={0.5}>
      {parts.map((p, i) => (
        <g key={i} transform={`translate(${p.tx} ${p.ty})`}>
          <path d={p.d} fill={p.kind === "skin" ? "#FAF6EE" : tint} stroke={tint} strokeWidth={p.kind === "skin" ? 5 : 0} fillRule={p.evenodd ? "evenodd" : "nonzero"} />
        </g>
      ))}
      {/* a simple shoulder blob so each reads as a person, not a floating head */}
      <path d="M 300 560 Q 442 500 584 560 L 620 760 L 264 760 Z" fill={tint} opacity={0.9} />
    </g>
  );
};

export const CrowdDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {stageShapes("stage-spotlight").map((s, i) => (
          <path key={i} d={s.d} fill={s.fill ?? "none"} fillRule="evenodd" stroke={s.stroke ?? "none"} strokeWidth={s.sw ?? 0} opacity={s.opacity ?? 1} />
        ))}
        {/* background crowd (tinted Open Peeps) */}
        {CROWD.map((c, i) => (
          <CrowdHead key={i} hair={c.hair} face={c.face} x={c.x} y={1020} s={0.34} tint={SCENE_PALETTE.sky} />
        ))}
        <text x={70} y={60} fontFamily={FONTS.heading} fontSize={42} fill={COLORS.ink}>Crowd tier — cast member + tinted Open Peeps audience</text>
      </svg>
      {/* cast member (v2) in front, on the spotlight */}
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <CastStatic id="sage" pose="presenting" expression="happy" cx={960} feetY={900} base={1.15} />
      </svg>
    </AbsoluteFill>
  );
};
