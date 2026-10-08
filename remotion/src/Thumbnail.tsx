import React from "react";
import { AbsoluteFill } from "remotion";
import type { RenderProps } from "./schema";
import { COLORS, FONTS, VIDEO } from "./theme";
import { type StickPose } from "./drawing/stick";
import { type Expression } from "./drawing/character";
import { CAST, castFigureRender, type CastId } from "./drawing/cast";
import { castFillColor } from "./components/CastFigure";
import { propShape, type PropKind } from "./drawing/props";
import { stageShapes } from "./drawing/stage";

/** Fully-drawn Cast figure (no animation — this is a still), flat-filled. */
const Figure: React.FC<{
  cast: CastId;
  pose: StickPose;
  expression: Expression;
  x: number;
  y: number;
  scale: number;
}> = ({ cast, pose, expression, x, y, scale }) => {
  const r = castFigureRender(CAST[cast], pose, { expression });
  const sw = 2 / scale;
  const cc = castFillColor(cast, "torso");
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

const Prop: React.FC<{
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  color: string;
}> = ({ kind, x, y, w, color }) => {
  const shape = propShape(kind, { variant: kind === "arrow" ? "down" : undefined, state: "on" });
  const scale = w / shape.viewBox.w;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {shape.strokes.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={6 / scale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
};

/**
 * Creative thumbnail: a DRAWN SCENE (not a text card). Big expressive figure
 * on an accent burst, 1–2 props, a huge Caveat headline with a marker
 * underline, and the book title small in the corner. Rendered 1920×1080; the
 * pipeline also emits a 1280×720 downscale.
 */
export const Thumbnail: React.FC<RenderProps> = ({ script }) => {
  const { thumbnail, book } = script;
  const figScale = 3.5;
  // center the 100×200 cast figure on the burst (cx 1500, feet ~ y 900)
  const figX = 1500 - 50 * figScale;
  const figY = 900 - 192 * figScale;
  const props = thumbnail.props;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}>
        {/* staged background — the figure stands on the grass (Phase 7) */}
        {stageShapes("outdoor").map((s, i) => (
          <path key={`bg${i}`} d={s.d} fill={s.fill ?? "none"} fillRule="evenodd" stroke={s.stroke ?? "none"} strokeWidth={s.sw ?? 0} strokeLinecap="round" opacity={(s.opacity ?? 1) * 0.9} />
        ))}
        {/* accent burst behind the figure */}
        <circle cx={1500} cy={560} r={400} fill={COLORS.flameSoft} opacity={0.5} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r0 = 410;
          const r1 = 470;
          return (
            <line
              key={i}
              x1={1500 + Math.cos(a) * r0}
              y1={560 + Math.sin(a) * r0}
              x2={1500 + Math.cos(a) * r1}
              y2={560 + Math.sin(a) * r1}
              stroke={COLORS.flame}
              strokeWidth={10}
              strokeLinecap="round"
            />
          );
        })}

        {props[0] && <Prop kind={props[0]} x={1120} y={560} w={230} color={COLORS.flame} />}
        {props[1] && <Prop kind={props[1]} x={1720} y={600} w={210} color={COLORS.ink} />}

        <Figure cast={thumbnail.cast} pose={thumbnail.pose} expression={thumbnail.expression} x={figX} y={figY} scale={figScale} />

        {/* marker underline beneath the headline block */}
        <path
          d="M 110 470 Q 360 450 640 466 T 1080 458"
          fill="none"
          stroke={COLORS.flame}
          strokeWidth={22}
          strokeLinecap="round"
        />
      </svg>

      {/* headline */}
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 150,
          width: 1000,
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: 170,
          lineHeight: 0.98,
          color: COLORS.ink,
        }}
      >
        {thumbnail.headline}
      </div>

      {/* optional subline */}
      {thumbnail.subline && (
        <div
          style={{
            position: "absolute",
            left: 114,
            top: 500,
            width: 980,
            fontFamily: FONTS.label,
            fontSize: 64,
            color: COLORS.inkSoft,
          }}
        >
          {thumbnail.subline}
        </div>
      )}

      {/* book title, small, bottom-left corner */}
      <div
        style={{
          position: "absolute",
          left: 114,
          bottom: 70,
          fontFamily: FONTS.label,
          fontSize: 46,
          letterSpacing: 1,
          color: COLORS.flame,
        }}
      >
        {book.title.toUpperCase()} · {book.author}
      </div>
    </AbsoluteFill>
  );
};
