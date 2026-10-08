import React from "react";
import { staticFile, useCurrentFrame } from "remotion";
import type { HandState } from "../drawing/plan";
import { HAND_IMAGES } from "../drawing/handConfig";

/**
 * The photographed drawing hand. Positioned so the pen NIB sits exactly on the
 * live stroke point, tilted a few degrees into the stroke direction, with a
 * soft drop shadow that separates on lift, ±1px low-frequency jitter while
 * drawing, and the grip image alternating per stroke (no mid-stroke swap).
 * Rendered as an HTML overlay above the drawing SVG.
 */
export const PhotoHand: React.FC<{ hand: HandState }> = ({ hand }) => {
  const frame = useCurrentFrame();
  if (!hand.visible || HAND_IMAGES.length === 0) return null;

  const img = HAND_IMAGES[hand.grip % HAND_IMAGES.length]!;
  const scale = img.renderHeight / img.height;
  const w = img.width * scale;
  const h = img.renderHeight;
  const tipX = img.penTip.x * scale;
  const tipY = img.penTip.y * scale;

  // Low-frequency jitter only while actually drawing (on paper).
  const drawing = hand.lift <= 1.001;
  const jx = drawing ? Math.sin(frame * 0.9) * 1 : 0;
  const jy = drawing ? Math.cos(frame * 1.1) * 1 : 0;

  // Lift separation (0 on paper → 1 fully lifted).
  const sep = Math.max(0, Math.min(1, (hand.lift - 1) / 0.12));
  const shDX = 7 + sep * 16;
  const shDY = 11 + sep * 22;
  const shBlur = 5 + sep * 8;
  const shOpacity = 0.26 - sep * 0.09;

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    left: -tipX,
    top: -tipY,
    width: w,
    height: h,
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate(${hand.x + jx}px, ${hand.y + jy}px) rotate(${hand.angle}deg) scale(${hand.lift})`,
        transformOrigin: "0 0",
        pointerEvents: "none",
      }}
    >
      {/* soft drop shadow */}
      <img
        src={staticFile(img.src)}
        style={{
          ...imgStyle,
          left: -tipX + shDX,
          top: -tipY + shDY,
          filter: `brightness(0) blur(${shBlur}px)`,
          opacity: shOpacity,
        }}
        alt=""
      />
      {/* the hand */}
      <img src={staticFile(img.src)} style={imgStyle} alt="" />
    </div>
  );
};
