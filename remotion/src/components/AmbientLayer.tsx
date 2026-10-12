import React from "react";
import { useCurrentFrame } from "remotion";
import { VIDEO, COLORS, SCENE_TINT } from "../theme";

/**
 * A quiet, always-moving background layer so NO scene ever freezes. Soft
 * hand-drawn doodles (rings, clouds, plus-marks, dots) drift slowly on sine
 * paths with a gentle bob + breathing scale. Deliberately low-contrast and
 * low-opacity — it adds life at the edges without competing with the content
 * or the flame accent. Driven purely by useCurrentFrame so it's render-safe.
 */

type Doodle = {
  kind: "ring" | "cloud" | "plus" | "dot" | "zig";
  x: number; // base position (fraction of width/height)
  y: number;
  r: number; // size in px
  color: string;
  op: number;
  speed: number; // drift speed multiplier
  phase: number; // sine phase offset
};

const CLOUD = (r: number) =>
  `M ${-r} 0 Q ${-r} ${-r * 0.7} ${-r * 0.4} ${-r * 0.6} Q ${-r * 0.2} ${-r} ${r * 0.2} ${-r * 0.7} Q ${r * 0.7} ${-r} ${r * 0.7} ${-r * 0.4} Q ${r * 1.1} ${-r * 0.3} ${r} 0 Z`;
const PLUS = (r: number) => `M ${-r} 0 L ${r} 0 M 0 ${-r} L 0 ${r}`;
const ZIG = (r: number) => `M ${-r} 0 L ${-r * 0.33} ${-r * 0.6} L ${r * 0.33} ${r * 0.6} L ${r} 0`;

// A fixed, hand-placed scatter (no RNG so renders are deterministic across
// frames). Tuned to sit in the margins / upper area, away from centre content.
const DOODLES: Doodle[] = [
  { kind: "cloud", x: 0.12, y: 0.14, r: 46, color: SCENE_TINT.sky, op: 0.5, speed: 1.0, phase: 0.0 },
  { kind: "cloud", x: 0.82, y: 0.1, r: 60, color: SCENE_TINT.sky, op: 0.45, speed: 0.8, phase: 1.7 },
  { kind: "ring", x: 0.9, y: 0.32, r: 30, color: COLORS.flameSoft, op: 0.5, speed: 1.3, phase: 2.6 },
  { kind: "plus", x: 0.08, y: 0.42, r: 18, color: COLORS.flame, op: 0.28, speed: 1.1, phase: 0.9 },
  { kind: "dot", x: 0.2, y: 0.74, r: 11, color: SCENE_TINT.leaf, op: 0.55, speed: 1.5, phase: 3.1 },
  { kind: "zig", x: 0.72, y: 0.8, r: 26, color: COLORS.flameSoft, op: 0.5, speed: 0.9, phase: 1.2 },
  { kind: "ring", x: 0.3, y: 0.2, r: 20, color: SCENE_TINT.sun, op: 0.6, speed: 1.2, phase: 4.0 },
  { kind: "plus", x: 0.94, y: 0.6, r: 15, color: COLORS.flame, op: 0.26, speed: 1.4, phase: 2.0 },
  { kind: "dot", x: 0.86, y: 0.86, r: 9, color: SCENE_TINT.coral, op: 0.6, speed: 1.6, phase: 0.4 },
];

export const AmbientLayer: React.FC<{
  /** 0..1 overall strength (shorts can dial it down). */
  intensity?: number;
  width?: number;
  height?: number;
}> = ({ intensity = 1, width = VIDEO.width, height = VIDEO.height }) => {
  const frame = useCurrentFrame();
  const t = frame / VIDEO.fps; // seconds
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      {DOODLES.map((d, i) => {
        const bx = d.x * width;
        const by = d.y * height;
        // slow lissajous drift + bob
        const dx = Math.sin(t * 0.28 * d.speed + d.phase) * 22;
        const dy = Math.cos(t * 0.22 * d.speed + d.phase * 1.3) * 16;
        const rot = Math.sin(t * 0.18 * d.speed + d.phase) * 10;
        const breathe = 1 + Math.sin(t * 0.5 * d.speed + d.phase) * 0.06;
        const op = d.op * intensity;
        const common = {
          transform: `translate(${bx + dx} ${by + dy}) rotate(${rot}) scale(${breathe})`,
        };
        if (d.kind === "dot") {
          return <circle key={i} cx={0} cy={0} r={d.r} fill={d.color} opacity={op} {...common} />;
        }
        if (d.kind === "ring") {
          return <circle key={i} cx={0} cy={0} r={d.r} fill="none" stroke={d.color} strokeWidth={4} opacity={op} {...common} />;
        }
        if (d.kind === "cloud") {
          return <path key={i} d={CLOUD(d.r)} fill={d.color} opacity={op} {...common} />;
        }
        const path = d.kind === "plus" ? PLUS(d.r) : ZIG(d.r);
        return (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={d.color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={op}
            {...common}
          />
        );
      })}
    </svg>
  );
};
