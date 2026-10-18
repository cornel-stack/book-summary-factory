import React from "react";
import { Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS, SUBSCRIBE_OVERLAY_FRAMES } from "../theme";
import { useBrand } from "../brand";

/**
 * Animated subscribe prompt (subscriber-growth pass). Pops in on the spoken
 * "subscribe" phrase: value line + red pill → a cursor glides in and clicks →
 * the pill flips to grey "Subscribed ✓" → the bell rings → slides out.
 * Total = SUBSCRIBE_OVERLAY_FRAMES. Works at 16:9 (lower-right, clear of the
 * board-memory band on the left) and 9:16 (centered, above the caption rail).
 */
const RED = "#E62117";
const GREY = "#5F5B57";

const Bell: React.FC<{ size: number; color: string; ring: number }> = ({ size, color, ring }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${ring}deg)`, transformOrigin: "50% 10%" }}>
    <path
      d="M12 2.5c-.8 0-1.4.6-1.4 1.4v.6C7.9 5.1 6 7.5 6 10.4v4.4l-1.7 2.1c-.4.5 0 1.1.6 1.1h14.2c.6 0 1-.6.6-1.1L18 14.8v-4.4c0-2.9-1.9-5.3-4.6-5.9v-.6c0-.8-.6-1.4-1.4-1.4z M9.6 19.3a2.4 2.4 0 0 0 4.8 0z"
      fill={color}
    />
  </svg>
);

const Cursor: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 20 28">
    <path d="M2 1 L2 22 L7.5 17 L11 26 L14.5 24.5 L11 15.8 L18 15.8 Z" fill="#FFFFFF" stroke="#1C1A17" strokeWidth={1.8} strokeLinejoin="round" />
  </svg>
);

export const SubscribeOverlay: React.FC<{ startFrame: number; line?: string }> = ({ startFrame, line = "1 book · every day" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const brand = useBrand();
  const f = frame - startFrame;
  if (f < 0 || f > SUBSCRIBE_OVERLAY_FRAMES) return null;

  const vertical = height > width;
  const s = vertical ? 1.35 : 1; // scale everything for the 1080-wide vertical frame
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  const enter = spring({ frame: f, fps, config: { damping: 11, stiffness: 160 } }); // overshoot pop
  const exit = interpolate(f, [SUBSCRIBE_OVERLAY_FRAMES - 14, SUBSCRIBE_OVERLAY_FRAMES], [0, 1], clamp);
  const CLICK = 34; // frame the cursor presses the button
  const clicked = f >= CLICK;
  const press = f >= CLICK && f < CLICK + 6 ? 0.92 : 1;
  const ring = f >= CLICK + 10 && f < CLICK + 40 ? Math.sin((f - CLICK - 10) * 0.9) * 22 * (1 - (f - CLICK - 10) / 30) : 0;

  // cursor glides in from bottom-right, presses, then drifts off
  const cx = interpolate(f, [8, CLICK - 2, CLICK + 30, CLICK + 50], [260, 150, 150, 320], clamp) * s;
  const cy = interpolate(f, [8, CLICK - 2, CLICK + 30, CLICK + 50], [140, 40, 40, 160], clamp) * s;
  const cursorOp = interpolate(f, [8, 16, CLICK + 36, CLICK + 50], [0, 1, 1, 0], clamp);

  const pillW = 330 * s;
  const pillH = 84 * s;
  const boxW = pillW + 110 * s;
  const left = vertical ? (width - boxW) / 2 : width - boxW - 70;
  const top = vertical ? height - 640 : height - 250;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: boxW,
        transform: `translateY(${(1 - enter) * 60 * s + exit * 80 * s}px) scale(${0.6 + enter * 0.4})`,
        opacity: Math.min(1, enter * 1.4) * (1 - exit),
        pointerEvents: "none",
      }}
    >
      <Sequence from={startFrame + CLICK} durationInFrames={20} layout="none">
        <Audio src={staticFile("sfx/click.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={startFrame + CLICK + 10} durationInFrames={40} layout="none">
        <Audio src={staticFile("sfx/ding.wav")} volume={0.45} />
      </Sequence>
      <div
        style={{
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: 44 * s,
          color: brand.chrome.text,
          background: brand.chrome.bg,
          borderRadius: 14 * s,
          padding: `${6 * s}px ${16 * s}px`,
          marginBottom: 12 * s,
          display: "inline-block",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {line}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * s }}>
        <div
          style={{
            width: pillW,
            height: pillH,
            borderRadius: pillH / 2,
            background: clicked ? GREY : RED,
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: 34 * s,
            letterSpacing: 1.5,
            transform: `scale(${press})`,
            boxShadow: `0 ${6 * s}px 0 rgba(28,26,23,0.18)`,
          }}
        >
          {clicked ? "SUBSCRIBED ✓" : "SUBSCRIBE"}
        </div>
        <div
          style={{
            width: pillH,
            height: pillH,
            borderRadius: pillH / 2,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 ${6 * s}px 0 rgba(28,26,23,0.18)`,
          }}
        >
          <Bell size={50 * s} color={clicked ? brand.accent : GREY} ring={ring} />
        </div>
      </div>
      <div style={{ position: "absolute", left: cx, top: 56 * s + cy, opacity: cursorOp }}>
        <Cursor size={40 * s} />
      </div>
    </div>
  );
};
