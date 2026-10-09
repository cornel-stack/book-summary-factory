import { QuietBackdrop } from "../components/QuietBackdrop";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { DrawingBoard } from "../components/DrawingBoard";
import { underline } from "../drawing/icons";
import { propShape } from "../drawing/props";
import type { BoardElement } from "../drawing/types";

/**
 * A brief, non-salesy call-to-action. "card" = centered prompt with a drawn
 * arrow + flame underline (used after the hook / at the close). "corner" = a
 * small lower-left prompt that doesn't take the whole frame.
 */
export const CtaCard: React.FC<{ visual: { text: string; style: "card" | "corner" } }> = ({ visual }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const corner = visual.style === "corner";
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;
  const w = Math.min(VIDEO.width - LAYOUT.safeMargin * 2, Math.max(420, visual.text.length * 30));

  const elements: BoardElement[] = corner
    ? [
        {
          key: "arrow",
          shape: propShape("arrow", { variant: "down" }),
          box: { x: 150, y: VIDEO.height - 360, w: 120, h: 150 },
          startFrame: 4,
          strokeColor: brand.accent,
          strokeWidth: 8,
        },
      ]
    : [
        {
          key: "arrow",
          shape: propShape("arrow", { variant: "down" }),
          box: { x: cx - 70, y: cy - 250, w: 140, h: 170 },
          startFrame: 4,
          strokeColor: brand.accent,
          strokeWidth: 9,
        },
        {
          key: "underline",
          shape: underline(w),
          box: { x: cx - w / 2, y: cy + 110, w, h: 40 },
          startFrame: 22,
          strokeColor: brand.accent,
          strokeWidth: 9,
        },
      ];

  const op = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <QuietBackdrop />
      <DrawingBoard elements={elements} />
      <div
        style={
          corner
            ? {
                position: "absolute",
                left: 300,
                bottom: 150,
                width: 900,
                textAlign: "left",
                fontFamily: FONTS.heading,
                fontSize: LAYOUT.subtitleSize,
                color: COLORS.ink,
                opacity: op,
              }
            : {
                position: "absolute",
                top: cy - 40,
                width: "100%",
                textAlign: "center",
                fontFamily: FONTS.heading,
                fontSize: LAYOUT.titleSize * 0.82,
                color: COLORS.ink,
                opacity: op,
              }
        }
      >
        {visual.text}
      </div>
    </AbsoluteFill>
  );
};
