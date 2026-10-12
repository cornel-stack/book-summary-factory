import React from "react";
import { VIDEO, SCENE_TINT } from "../theme";
import { AmbientLayer } from "./AmbientLayer";

/**
 * A quiet backdrop for non-character scenes (titles, charts, lists, recaps,
 * quote, CTA): a slow drifting ambient doodle layer (so the frame is NEVER
 * static) + a very faint floor band + ground line so content sits on something
 * and nothing floats on raw cream.
 */
export const QuietBackdrop: React.FC<{ ground?: number; ambient?: boolean }> = ({ ground = 905, ambient = true }) => (
  <>
    {ambient && <AmbientLayer intensity={0.85} />}
    <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={ground} width={VIDEO.width} height={VIDEO.height - ground} fill={SCENE_TINT.sand} opacity={0.35} />
      <line x1={0} y1={ground} x2={VIDEO.width} y2={ground} stroke="#1C1A17" strokeWidth={2} opacity={0.18} />
    </svg>
  </>
);
