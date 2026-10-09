import React from "react";
import { AbsoluteFill } from "remotion";
import { BrandProvider, useBrand } from "./brand";
import { BRANDS, type Brand, type BrandId } from "../../config/brands";
import { COLORS, FONTS, VIDEO } from "./theme";
import { CastStatic } from "./components/CastFigure";
import { propShape } from "./drawing/props";
import { stageShapes } from "./drawing/stage";

/**
 * Dev still: the SAME scene rendered in both brands, side by side — the quick
 * visual check that the brand layer only swaps paper / accent / highlight /
 * chrome while the shared production system (cast, wardrobe, stages, props) is
 * byte-identical. Rendered statically (no draw-in) so the figure + its accent
 * item show immediately: note Max's tie — Dawn Coral vs the light navy on-ink.
 */
const Swatch: React.FC<{ c: string; label: string }> = ({ c, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 30, height: 30, borderRadius: 6, background: c, border: `2px solid ${COLORS.ink}22` }} />
    <span style={{ fontFamily: FONTS.body, fontSize: 22, color: COLORS.ink }}>{label}</span>
  </div>
);

/** A staged scene drawn statically into a 1920×1080 SVG, scaled to the half. */
const Stage: React.FC = () => {
  const brand = useBrand();
  const target = propShape("target");
  const tScale = 380 / target.viewBox.w;
  return (
    <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}>
      {stageShapes("desk-office").map((s, i) => (
        <path key={`bg${i}`} d={s.d} fill={s.fill ?? "none"} fillRule="evenodd" stroke={s.stroke ?? "none"} strokeWidth={s.sw ?? 0} opacity={s.opacity ?? 1} />
      ))}
      {/* accent prop (target) — on-paper accent */}
      <g transform={`translate(1180 360) scale(${tScale})`}>
        {target.fills?.map((f, j) => <path key={`tf${j}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />)}
        {target.strokes.map((d, j) => <path key={`ts${j}`} d={d} fill="none" stroke={brand.accent} strokeWidth={7 / tScale} strokeLinecap="round" strokeLinejoin="round" />)}
      </g>
      {/* the cast: Max, presenting — his tie is the accent item ON the character */}
      <CastStatic id="max" pose="presenting" expression="happy" cx={620} feetY={905} base={3.3} />
      {/* title with the brand underline */}
      <text x={120} y={210} fontFamily={FONTS.heading} fontSize={110} fontWeight={700} fill={COLORS.ink}>One scene, two brands</text>
      <path d="M 124 250 Q 400 232 760 248 T 1300 240" fill="none" stroke={brand.accent} strokeWidth={16} strokeLinecap="round" />
    </svg>
  );
};

const Half: React.FC<{ id: BrandId; brand: Brand }> = ({ id, brand }) => (
  <BrandProvider brand={id}>
    <div style={{ position: "relative", width: 960, height: 1080, overflow: "hidden", background: brand.paper, borderRight: `2px solid ${COLORS.ink}22` }}>
      <div style={{ position: "absolute", top: 60, left: 0, width: 1920, height: 1080, transform: "scale(0.5)", transformOrigin: "top left" }}>
        <Stage />
      </div>
      <div style={{ position: "absolute", top: 16, left: 24, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 44, color: COLORS.ink }}>{brand.name}</div>
      <div style={{ position: "absolute", bottom: 24, left: 24, display: "flex", gap: 22, flexWrap: "wrap", width: 900 }}>
        <Swatch c={brand.paper} label="paper" />
        <Swatch c={brand.accent} label="accent" />
        <Swatch c={brand.accentOnInk} label="on-ink (tie)" />
        <Swatch c={brand.highlight} label="highlight" />
        <Swatch c={brand.chrome.bg} label="chrome" />
        <Swatch c={brand.caption.wash} label="caption wash" />
      </div>
    </div>
  </BrandProvider>
);

export const BrandSheet: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#ffffff", flexDirection: "row" }}>
    <Half id="readlark" brand={BRANDS.readlark} />
    <Half id="percuriam" brand={BRANDS.percuriam} />
  </AbsoluteFill>
);
