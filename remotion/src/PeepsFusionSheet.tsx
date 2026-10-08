import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS, CAST_WARDROBE } from "./theme";
import { CAST, castFigureRender, type CastId, type Fill } from "./drawing/cast";
import { CastStatic, fillColor } from "./components/CastFigure";
import { peepsHeadParts, peepsHeadMount, PEEPS_EXPRESSION, PEEPS_HAIR_FOR } from "./drawing/peepsHead";
import type { Expression } from "./drawing/character";
import type { StickPose } from "./drawing/stick";

const EXPRS: Expression[] = ["neutral", "happy", "worried", "shocked", "angry", "tired", "curious"];

/** A fusion figure: OUR body (wardrobe-colored) + an Open Peeps head. */
const FusionFigure: React.FC<{
  id: CastId;
  pose?: StickPose;
  expression?: Expression;
  silhouette?: boolean;
  cx: number;
  feetY: number;
  base: number;
}> = ({ id, pose = "standing", expression = "neutral", silhouette, cx, feetY, base }) => {
  const def = CAST[id];
  const scale = base * def.heightScale;
  const r = castFigureRender(def, pose, { expression });
  const sw = 2 / scale;
  const tx = cx - 50 * scale;
  const ty = feetY - 192 * scale;
  const wardrobe = CAST_WARDROBE[id];
  const col = (f: Fill) => (silhouette ? COLORS.ink : f === "top" ? wardrobe : f === "hand" ? COLORS.paper : fillColor(f));

  const [hcx, headCy, headR] = r.head;
  const chinY = headCy + headR;
  const head = peepsHeadParts(PEEPS_HAIR_FOR[id] ?? "Short", PEEPS_EXPRESSION[expression] ?? "Calm");
  const mount = peepsHeadMount(hcx, chinY, headR);

  return (
    <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
      {/* our body only (skip our head/face fills) */}
      {r.bodyFills.map((p, i) => (
        <path key={i} d={p.d} fill={col(p.fill)} fillRule="evenodd" stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      {/* Open Peeps head mounted at the neck */}
      <g transform={mount}>
        {head.map((p, i) => (
          <g key={`hp${i}`} transform={`translate(${p.tx} ${p.ty})`}>
            <path
              d={p.d}
              fill={silhouette ? COLORS.ink : p.kind === "skin" ? COLORS.paper : COLORS.ink}
              stroke={p.kind === "skin" ? COLORS.ink : "none"}
              strokeWidth={p.kind === "skin" ? 6 : 0}
              fillRule={p.evenodd ? "evenodd" : "nonzero"}
            />
          </g>
        ))}
        {/* the character's flame accent kept on the Peeps head (Maya: hairband) */}
        {!silhouette && def.accent === "hairband" && (
          <path d="M 250 300 Q 455 232 648 318" fill="none" stroke={COLORS.flame} strokeWidth={30} strokeLinecap="round" />
        )}
      </g>
    </g>
  );
};

const Label: React.FC<{ x: number; y: number; t: string; c?: string; s?: number }> = ({ x, y, t, c = COLORS.inkSoft, s = 24 }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONTS.label} fontSize={s} fill={c}>{t}</text>
);

export const PeepsFusionSheet: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <text x={70} y={56} fontFamily={FONTS.heading} fontSize={46} fill={COLORS.ink}>Open Peeps fusion — Max &amp; Maya (cast v2 vs fusion)</text>

        {/* old vs new, standing, both chars */}
        <Label x={300} y={110} t="Max — cast v2" c={COLORS.flame} />
        <CastStatic id="max" pose="standing" expression="happy" cx={300} feetY={470} base={0.78} />
        <Label x={560} y={110} t="Max — FUSION" c={COLORS.flame} />
        <FusionFigure id="max" pose="standing" expression="happy" cx={560} feetY={470} base={0.78} />
        <Label x={1120} y={110} t="Maya — cast v2" c={COLORS.flame} />
        <CastStatic id="maya" pose="standing" expression="happy" cx={1120} feetY={470} base={0.78} />
        <Label x={1380} y={110} t="Maya — FUSION" c={COLORS.flame} />
        <FusionFigure id="maya" pose="standing" expression="happy" cx={1380} feetY={470} base={0.78} />

        {/* 7 expressions — fusion, front */}
        <Label x={960} y={540} t="fusion expressions (front) — Max top, Maya bottom" />
        {EXPRS.map((e, i) => (
          <React.Fragment key={`mx${e}`}>
            <FusionFigure id="max" pose="standing" expression={e} cx={180 + i * 250} feetY={760} base={0.5} />
            <Label x={180 + i * 250} y={580} t={e} c={COLORS.flame} s={20} />
          </React.Fragment>
        ))}
        {EXPRS.map((e, i) => (
          <FusionFigure key={`my${e}`} id="maya" pose="standing" expression={e} cx={180 + i * 250} feetY={1000} base={0.5} />
        ))}

        {/* silhouette identity check */}
        <line x1={70} y1={1030} x2={1850} y2={1030} stroke={COLORS.inkSoft} strokeWidth={1} opacity={0.3} />
      </svg>
    </AbsoluteFill>
  );
};
