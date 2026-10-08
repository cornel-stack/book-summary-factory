import React from "react";
import { VIDEO, SCENE_TINT } from "../theme";

/**
 * A quiet backdrop for non-character scenes (titles, charts, lists, recaps,
 * quote, CTA): a very faint floor band + ground line so content sits on
 * something and nothing floats on raw cream — deliberately quieter than the
 * character-scene stages.
 */
export const QuietBackdrop: React.FC<{ ground?: number }> = ({ ground = 905 }) => (
  <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{ position: "absolute", inset: 0 }}>
    <rect x={0} y={ground} width={VIDEO.width} height={VIDEO.height - ground} fill={SCENE_TINT.sand} opacity={0.35} />
    <line x1={0} y1={ground} x2={VIDEO.width} y2={ground} stroke="#1C1A17" strokeWidth={2} opacity={0.18} />
  </svg>
);
