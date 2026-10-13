import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLORS, FONTS, VIDEO } from "./theme";
import { getBrand, type BrandId } from "../../config/brands";
import { CAST, castFigureRender, type CastId } from "./drawing/cast";
import { castFillColor, type CastPalette } from "./components/CastFigure";
import { AmbientLayer } from "./components/AmbientLayer";
import { type StickPose } from "./drawing/stick";
import { type Expression } from "./drawing/character";

export type CoverThumbProps = {
  cover: string; // staticFile path, e.g. "covers/atomic-habits.jpeg"
  kicker?: string; // small ribbon word(s), Caveat
  words: string[]; // 2–3 BIG Anton punch words (last renders in flame)
  cast: CastId;
  pose: StickPose;
  expression: Expression;
  brand?: BrandId;
  tag?: string; // bottom-left tag; defaults to brand wordmark
};

const Figure: React.FC<{ cast: CastId; pose: StickPose; expression: Expression; x: number; y: number; scale: number; pal: CastPalette }> = ({
  cast,
  pose,
  expression,
  x,
  y,
  scale,
  pal,
}) => {
  const r = castFigureRender(CAST[cast], pose, { expression });
  const sw = 2 / scale;
  const cc = castFillColor(cast, "torso", pal);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {r.fills.map((p, i) => (
        <path key={i} d={p.d} fill={cc(p.fill)} fillRule="evenodd" stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      {r.face.map((d, i) => (
        <path key={`f${i}`} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw * 1.4} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
};

/**
 * Cover-led YouTube thumbnail: the REAL book cover is the hero on a flame
 * spotlight (right third), a bold Anton hook headline on the left (payoff word
 * in flame), and one cast member reacting from the lower-left — all in the
 * channel's warm hand-drawn style. Rendered 1920×1080.
 */
export const CoverThumbnail: React.FC<CoverThumbProps> = ({ cover, kicker, words, cast, pose, expression, brand: brandId = "readlark" as BrandId, tag }) => {
  const brand = getBrand(brandId);
  const pal: CastPalette = { accent: brand.accentOnInk, paper: brand.paper };

  // book cover hero (right third)
  const coverCx = 1430;
  const coverCy = 500;
  const coverH = 780;
  const coverW = coverH * (498 / 615);

  // figure, lower-left, pointing toward the cover
  const figScale = 2.7;
  const figX = 560 - 50 * figScale;
  const figY = 1030 - 192 * figScale;

  const fontSize = Math.max(100, Math.min(176, Math.round(900 / Math.max(5, Math.max(...words.map((w) => w.length))) * 1.55)));

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <AmbientLayer intensity={0.7} />
      <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}>
        {/* ground */}
        <rect x={0} y={915} width={VIDEO.width} height={VIDEO.height - 915} fill="#E7D6B8" opacity={0.4} />
        <line x1={0} y1={915} x2={VIDEO.width} y2={915} stroke={COLORS.ink} strokeWidth={2} opacity={0.15} />

        {/* flame spotlight behind the cover */}
        <circle cx={coverCx} cy={coverCy} r={470} fill={COLORS.flameSoft} opacity={0.72} />
        <circle cx={coverCx} cy={coverCy} r={470} fill="none" stroke={COLORS.flame} strokeWidth={10} opacity={0.85} />
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={coverCx + Math.cos(a) * 492}
              y1={coverCy + Math.sin(a) * 492}
              x2={coverCx + Math.cos(a) * 560}
              y2={coverCy + Math.sin(a) * 560}
              stroke={COLORS.flame}
              strokeWidth={12}
              strokeLinecap="round"
            />
          );
        })}

        <Figure cast={cast} pose={pose} expression={expression} x={figX} y={figY} scale={figScale} pal={pal} />
      </svg>

      {/* the real book cover — hero, tilted, with a drop shadow */}
      <Img
        src={staticFile(cover)}
        style={{
          position: "absolute",
          left: coverCx - coverW / 2,
          top: coverCy - coverH / 2,
          width: coverW,
          height: coverH,
          borderRadius: 10,
          transform: "rotate(-5deg)",
          filter: "drop-shadow(0 22px 34px rgba(28,26,23,0.42))",
        }}
      />

      {/* kicker ribbon */}
      {kicker && (
        <div
          style={{
            position: "absolute",
            left: 86,
            top: 92,
            padding: "10px 26px",
            background: COLORS.flame,
            color: "#FFFFFF",
            fontFamily: FONTS.label,
            fontSize: 48,
            letterSpacing: 2,
            borderRadius: 10,
            transform: "rotate(-2deg)",
          }}
        >
          {kicker}
        </div>
      )}

      {/* bold Anton hook — last word in flame */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: kicker ? 200 : 150,
          width: 980,
          fontFamily: FONTS.display,
          fontSize,
          lineHeight: 0.95,
          letterSpacing: -1,
          textTransform: "uppercase",
          color: COLORS.ink,
        }}
      >
        {words.map((w, i) => (
          <div key={i} style={{ color: i === words.length - 1 ? COLORS.flame : undefined }}>
            {w}
          </div>
        ))}
      </div>

      {/* brand tag */}
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 54,
          fontFamily: FONTS.label,
          fontSize: 50,
          letterSpacing: 2,
          color: brand.accent,
        }}
      >
        {tag ?? `${brand.wordmark} · ${brand.domain}`}
      </div>
    </AbsoluteFill>
  );
};
