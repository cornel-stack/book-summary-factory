import React from "react";
import { useVideoConfig } from "remotion";
import { COLORS, SCENE_TINT } from "../theme";
import { useBrand } from "../brand";
import { FLOOR_Y } from "./verticalLayout";

/**
 * Vertical-native backdrop (1080×1920) — replaces Stage / QuietBackdrop, both of
 * which hardcode the 16:9 stage (GROUND_Y=905). Paper base + a soft floor band so
 * figures stand on something, plus an optional faint ground line. Reads the real
 * render dimensions from useVideoConfig and the brand's paper/divider.
 */
export const VerticalBackdrop: React.FC<{ ground?: number; showGroundLine?: boolean }> = ({
  ground = FLOOR_Y,
  showGroundLine = true,
}) => {
  const { width, height } = useVideoConfig();
  const brand = useBrand();
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0 }}
    >
      <rect x={0} y={0} width={width} height={height} fill={brand.paper} />
      <rect x={0} y={ground} width={width} height={height - ground} fill={SCENE_TINT.sand} opacity={0.3} />
      {showGroundLine && (
        <line
          x1={0}
          y1={ground}
          x2={width}
          y2={ground}
          stroke={brand.divider ?? COLORS.inkSoft}
          strokeWidth={2}
          opacity={0.2}
        />
      )}
    </svg>
  );
};
