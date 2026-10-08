import React from "react";
import { interpolate } from "remotion";
import { VIDEO } from "../theme";
import { stageShapes, type StageName } from "../drawing/stage";

/**
 * Renders a named stage as an AMBIENT background that washes in with a soft
 * fade (~0.45s), slightly before the hand starts drawing the hero elements, so
 * the frame feels full instantly without spending pen time.
 */
export const Stage: React.FC<{ name: StageName; frame: number }> = ({ name, frame }) => {
  const shapes = stageShapes(name);
  const op = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg
      width={VIDEO.width}
      height={VIDEO.height}
      viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`}
      style={{ position: "absolute", inset: 0, opacity: op }}
    >
      {shapes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={s.fill ?? "none"}
          fillRule="evenodd"
          stroke={s.stroke ?? "none"}
          strokeWidth={s.sw ?? 0}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={s.opacity ?? 1}
        />
      ))}
    </svg>
  );
};
