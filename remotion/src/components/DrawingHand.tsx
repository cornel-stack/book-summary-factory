import React from "react";
import { COLORS } from "../theme";
import type { HandState } from "../drawing/plan";

/**
 * A cartoon hand holding a pen, authored so the PEN NIB sits at the group's
 * local origin (0,0). The board places the group at the current pen tip, so
 * rotation/scale pivot around the nib and the tip always stays on the stroke.
 * Hand comes in from the lower-right; pen points up toward the drawing point.
 */
export const DrawingHand: React.FC<{ hand: HandState }> = ({ hand }) => {
  if (!hand.visible) return null;
  return (
    <g
      transform={`translate(${hand.x} ${hand.y}) rotate(${hand.angle}) scale(${hand.lift})`}
    >
      {/* pen shaft (points down-right from the nib) */}
      <path
        d="M -3.5 3.5 L 3.5 -3.5 L 53 46 L 46 53 Z"
        fill={COLORS.flame}
        stroke={COLORS.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* pen cap / end band */}
      <path
        d="M 44 44 L 58 58 L 50 66 L 36 52 Z"
        fill={COLORS.ink}
        stroke={COLORS.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* nib */}
      <path d="M 0 0 L 7 -0.5 L 1.5 6.5 Z" fill={COLORS.ink} />

      {/* hand / fist gripping the shaft, extending to a cuff at lower-right */}
      <path
        d="M 40 44
           C 33 52 35 66 46 72
           L 68 92
           C 78 101 97 97 99 84
           C 101 74 92 69 85 68
           C 92 59 87 49 77 50
           C 73 40 57 39 51 45
           Z"
        fill={COLORS.paper}
        stroke={COLORS.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* knuckle / finger separation lines */}
      <path d="M 58 49 L 67 61" stroke={COLORS.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M 69 53 L 78 63" stroke={COLORS.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M 47 54 L 61 62" stroke={COLORS.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* cuff */}
      <path
        d="M 82 90 L 96 80 L 110 98 L 96 108 Z"
        fill={COLORS.flameSoft}
        stroke={COLORS.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </g>
  );
};
