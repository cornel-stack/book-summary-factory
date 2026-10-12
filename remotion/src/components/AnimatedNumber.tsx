import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Thousands separators on the integer part; fixed decimals on the fraction. */
function formatNumber(n: number, decimals: number): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, frac] = fixed.split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + withCommas + (frac ? "." + frac : "");
}

/**
 * A number that counts up from 0 → `value` with a gentle spring, driven by the
 * render frame. The core "motion graphics" primitive — reused by StatChart,
 * RecapCard badges, and big-number callouts. `prefix`/`suffix` carry $, %, ×, B…
 */
export const AnimatedNumber: React.FC<{
  value: number;
  startFrame?: number;
  durationInFrames?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: React.CSSProperties;
}> = ({ value, startFrame = 0, durationInFrames = 34, prefix = "", suffix = "", decimals, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({
    frame: frame - startFrame,
    fps,
    durationInFrames,
    config: { damping: 200, mass: 0.9, stiffness: 120 },
  });
  const current = value * Math.max(0, Math.min(1, t));
  const dec = decimals ?? (!Number.isInteger(value) && Math.abs(value) < 100 ? 1 : 0);
  return (
    <span style={style}>
      {prefix}
      {formatNumber(current, dec)}
      {suffix}
    </span>
  );
};
