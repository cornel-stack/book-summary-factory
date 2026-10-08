import React from "react";
import { COLORS, CAST_WARDROBE } from "../theme";
import {
  CAST,
  castFigureRender,
  heldProp,
  seatStrokes,
  type CastId,
  type Fill,
  type SeatKind,
} from "../drawing/cast";
import { type CastView } from "../drawing/castPose";
import { type PropKind } from "../drawing/props";
import { type StickPose } from "../drawing/stick";
import type { Expression } from "../drawing/character";

// Base mapper: top/sleeve/hand → ink (no wardrobe).
export const fillColor = (f: Fill) =>
  f === "flame" ? COLORS.flame : f === "inkFar" ? COLORS.inkFar : f === "paper" ? COLORS.paper : COLORS.ink;

export type WardrobeMode = "torso" | "full-top" | "none";

/** Wardrobe-aware fill mapper: the torso ("top") takes the member's
 *  CAST_WARDROBE color; sleeves take it only in "full-top" mode; everything
 *  else is unchanged. Flame stays flame (brightest). "none"/silhouette → ink. */
export function castFillColor(id: CastId, mode: WardrobeMode) {
  const w = CAST_WARDROBE[id];
  return (f: Fill): string => {
    if (f === "flame") return COLORS.flame;
    if (f === "inkFar") return COLORS.inkFar;
    if (f === "paper") return COLORS.paper;
    if (f === "top") return mode === "none" ? COLORS.ink : w;
    if (f === "sleeve") return mode === "full-top" ? w : COLORS.ink;
    return COLORS.ink; // ink, hand
  };
}

/**
 * Static (non-animated) cast figure, placed by horizontal center + feet
 * baseline so different heights line up on the ground. Used by the character
 * sheet; the animated draw-in/alive version is CastCharacter.
 */
export const CastStatic: React.FC<{
  id: CastId;
  pose?: StickPose;
  expression?: Expression;
  flip?: boolean;
  silhouette?: boolean;
  blink?: boolean;
  view?: CastView;
  /** Seat under a SEATED figure. Defaults to "chair"; "none" opts out. */
  seat?: SeatKind;
  /** Wardrobe mode (default torso-only). */
  wardrobe?: WardrobeMode;
  holding?: { prop: PropKind; hand: "left" | "right" };
  cx: number;
  feetY: number;
  base: number;
}> = ({ id, pose = "standing", expression = "happy", flip, silhouette, blink, view, seat = "chair", wardrobe = "torso", holding, cx, feetY, base }) => {
  const scale = base * CAST[id].heightScale;
  const r = castFigureRender(CAST[id], pose, { expression, flip, silhouette, blink, view, seat });
  const sw = 2 / scale;
  const cc = castFillColor(id, silhouette ? "none" : wardrobe);
  const tx = cx - 50 * scale;
  const ty = feetY - 192 * scale;
  const held = holding ? heldProp(holding.prop, holding.hand === "left" ? r.gripL : r.gripR, 0.32 * CAST[id].build) : null;
  // seat under a seated figure: chair drawn behind, desk panel in front
  const face = flip ? -1 : 1;
  const sStrokes = pose === "sitting" && !silhouette ? seatStrokes(seat, cx, feetY, scale, face) : { behind: [], front: [] };
  return (
    <>
      {sStrokes.behind.map((d, i) => (
        <path key={`sb${i}`} d={d} fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={2} strokeLinejoin="round" />
      ))}
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        {r.fills.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={cc(p.fill)}
            fillRule="evenodd"
            stroke={COLORS.ink}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        ))}
        {r.face.map((d, i) => (
          <path
            key={`f${i}`}
            d={d}
            fill="none"
            stroke={COLORS.ink}
            strokeWidth={sw * 1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {held && (
          <g transform={held.transform}>
            {held.shape.strokes.map((d, i) => (
              <path key={`hp${i}`} d={d} fill={COLORS.paper} stroke={COLORS.ink} strokeWidth={sw * 1.3} strokeLinejoin="round" />
            ))}
          </g>
        )}
      </g>
      {sStrokes.front.map((d, i) => (
        <path key={`sf${i}`} d={d} fill={COLORS.paper} stroke={COLORS.ink} strokeWidth={2.5} strokeLinejoin="round" />
      ))}
    </>
  );
};
