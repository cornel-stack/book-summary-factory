import React from "react";
import { AbsoluteFill } from "remotion";
import type { RenderProps } from "./schema";
import { COLORS, FONTS, VIDEO } from "./theme";
import { type StickPose } from "./drawing/stick";
import { type Expression } from "./drawing/character";
import { CAST, castFigureRender, type CastId } from "./drawing/cast";
import { castFillColor, type CastPalette } from "./components/CastFigure";
import { propShape, type PropKind } from "./drawing/props";
import { stageShapes } from "./drawing/stage";
import { getBrand } from "../../config/brands";

/** Fully-drawn Cast figure (no animation — this is a still), flat-filled. */
const Figure: React.FC<{
  cast: CastId;
  pose: StickPose;
  expression: Expression;
  x: number;
  y: number;
  scale: number;
  pal: CastPalette;
}> = ({ cast, pose, expression, x, y, scale, pal }) => {
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

const Prop: React.FC<{ kind: PropKind; x: number; y: number; w: number; color: string }> = ({ kind, x, y, w, color }) => {
  const shape = propShape(kind, { variant: kind === "arrow" ? "down" : undefined, state: "on" });
  const scale = w / shape.viewBox.w;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {shape.fills?.map((f, i) => (
        <path key={`pf${i}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />
      ))}
      {shape.strokes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={6 / scale} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
};

/**
 * Hybrid thumbnail (Phase 17), research-led for CTR while keeping the hand-drawn
 * brand: ONE big emotive cast figure on the right third (rule-of-thirds) over a
 * flame spotlight burst; 2–3 BIG bold Anton punch words on the left with the key
 * word in flame; a pointer (spotlight ring / arrow) at the subject; minimal
 * chrome. Rendered 1920×1080; the pipeline emits a 1280×720 downscale.
 */
export const Thumbnail: React.FC<RenderProps> = ({ script }) => {
  const { thumbnail, book } = script;
  const brand = getBrand(script.brand);
  const pal: CastPalette = { accent: brand.accentOnInk, paper: brand.paper };

  // Subject on the right third, BIG and grounded.
  const subjCx = 1470;
  const feetY = 1016;
  const figScale = 4.1;
  const figX = subjCx - 50 * figScale;
  const figY = feetY - 192 * figScale;
  const burstCy = 540;

  const props = thumbnail.props;
  const words = thumbnail.punch_words ?? thumbnail.headline.split(/\s+/).slice(0, 3);
  // size the punch text to fit the left column (~1040px) by longest word.
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  const fontSize = Math.max(96, Math.min(230, Math.round(1180 / Math.max(5, longest) * 1.6)));
  const textBlockH = words.length * fontSize * 0.96;
  const textTop = 540 - textBlockH / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}>
        {/* warm ground so the figure is planted, not floating */}
        {stageShapes("outdoor").map((s, i) => (
          <path key={`bg${i}`} d={s.d} fill={s.fill ?? "none"} fillRule="evenodd" stroke={s.stroke ?? "none"} strokeWidth={s.sw ?? 0} strokeLinecap="round" opacity={(s.opacity ?? 1) * 0.85} />
        ))}

        {/* spotlight burst behind the subject (flame — THE punch color) */}
        {thumbnail.pointer !== "none" && (
          <>
            <circle cx={subjCx} cy={burstCy} r={430} fill={COLORS.flameSoft} opacity={0.75} />
            <circle cx={subjCx} cy={burstCy} r={430} fill="none" stroke={COLORS.flame} strokeWidth={10} opacity={0.9} />
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={subjCx + Math.cos(a) * 452}
                  y1={burstCy + Math.sin(a) * 452}
                  x2={subjCx + Math.cos(a) * 516}
                  y2={burstCy + Math.sin(a) * 516}
                  stroke={COLORS.flame}
                  strokeWidth={12}
                  strokeLinecap="round"
                />
              );
            })}
          </>
        )}

        {props[0] && <Prop kind={props[0]} x={1120} y={690} w={190} color={brand.accent} />}
        {props[1] && <Prop kind={props[1]} x={1760} y={720} w={180} color={brand.accent} />}

        <Figure cast={thumbnail.cast} pose={thumbnail.pose} expression={thumbnail.expression} x={figX} y={figY} scale={figScale} pal={pal} />

        {/* arrow pointer from the text toward the subject (if requested) */}
        {thumbnail.pointer === "arrow" && (
          <path d={`M 940 540 C 1010 520 1040 560 1070 540`} fill="none" stroke={COLORS.flame} strokeWidth={20} strokeLinecap="round" markerEnd="" />
        )}
        {thumbnail.pointer === "arrow" && <path d="M 1050 516 L 1086 540 L 1050 562 Z" fill={COLORS.flame} />}
      </svg>

      {/* punch words — big bold Anton, key (last) word in flame */}
      <div
        style={{
          position: "absolute",
          left: 86,
          top: textTop,
          width: 1020,
          fontFamily: FONTS.display,
          fontSize,
          lineHeight: 0.96,
          letterSpacing: -1,
          textTransform: "uppercase",
          color: thumbnail.bg ? "#FFFFFF" : COLORS.ink,
        }}
      >
        {words.map((w, i) => (
          <div key={i} style={{ color: i === words.length - 1 ? COLORS.flame : undefined, WebkitTextStroke: thumbnail.bg ? "0" : undefined }}>
            {w}
          </div>
        ))}
      </div>

      {/* book title, small, bottom-left corner */}
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 56,
          fontFamily: FONTS.label,
          fontSize: 48,
          letterSpacing: 1,
          color: brand.accent,
        }}
      >
        {book ? `${book.title.toUpperCase()} · ${book.author}` : `${brand.wordmark} · ${brand.domain}`}
      </div>
    </AbsoluteFill>
  );
};
