import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { evolvePath } from "@remotion/paths";

/**
 * Reveals an SVG path as if being drawn, using @remotion/paths `evolvePath`
 * to animate stroke-dashoffset from 0 → 100%. Two modes:
 *   - pass `progress` (0..1) to drive it externally (used by DrawingBoard), or
 *   - pass `startFrame`/`durationInFrames` to drive it from the timeline.
 */
export const DrawPath: React.FC<{
  d: string;
  color?: string;
  strokeWidth?: number;
  progress?: number;
  startFrame?: number;
  durationInFrames?: number;
}> = ({
  d,
  color = "#1C1A17",
  strokeWidth = 5,
  progress,
  startFrame = 0,
  durationInFrames = 20,
}) => {
  const frame = useCurrentFrame();
  const p =
    progress ??
    interpolate(frame, [startFrame, startFrame + durationInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
    />
  );
};
