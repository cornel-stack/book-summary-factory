import React from "react";
import { interpolate, spring } from "remotion";
import { COLORS, VIDEO } from "../theme";
import { propShape, type PropKind } from "../drawing/props";

/**
 * Reveal vocabulary (Phase 9): elements that arrive WITHOUT the hand — one art
 * style, many arrivals. Each item renders its colored prop (fills + outline)
 * with its reveal animation, starting at its sync frame.
 *   fade  — opacity in           wash  — left→right clip reveal
 *   pop   — scale-in w/ overshoot slide — in from below + fade
 */
export type Reveal = "pop" | "slide" | "fade" | "wash";
export type RevealItem = { key: string; kind: PropKind; variant?: string; state?: string; box: { x: number; y: number; w: number; h: number }; reveal: Reveal; start: number };

const DUR = 13; // ~0.45s

const One: React.FC<{ item: RevealItem; frame: number; fps: number }> = ({ item, frame, fps }) => {
  const s = propShape(item.kind, { variant: item.variant, state: item.state });
  const sc = Math.min(item.box.w / s.viewBox.w, item.box.h / s.viewBox.h);
  const tx = item.box.x + (item.box.w - s.viewBox.w * sc) / 2;
  const ty = item.box.y + (item.box.h - s.viewBox.h * sc) / 2;
  const sw = 4 / sc;
  const t = (frame - item.start) / DUR;
  if (t <= 0) return null;
  const tc = Math.min(1, t);
  let opacity = 1;
  let extra = "";
  let clip: string | undefined;
  const cx = s.viewBox.w / 2;
  const cy = s.viewBox.h / 2;
  if (item.reveal === "fade") opacity = tc;
  else if (item.reveal === "slide") {
    opacity = tc;
    const dy = (1 - interpolate(tc, [0, 1], [0, 1])) * 60;
    extra = ` translate(0 ${dy / sc})`;
  } else if (item.reveal === "pop") {
    const k = spring({ frame: frame - item.start, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
    extra = ` translate(${cx} ${cy}) scale(${Math.max(0.01, k)}) translate(${-cx} ${-cy})`;
    opacity = Math.min(1, t * 2);
  } else if (item.reveal === "wash") {
    clip = `inset(0 ${(1 - tc) * 100}% 0 0)`;
  }
  const paths = (
    <>
      {s.fills?.map((f, i) => (
        <path key={`f${i}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />
      ))}
      {s.strokes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </>
  );
  return (
    <g transform={`translate(${tx} ${ty}) scale(${sc})${extra}`} opacity={opacity} style={clip ? { clipPath: clip } : undefined}>
      {paths}
    </g>
  );
};

export const RevealLayer: React.FC<{ items: RevealItem[]; frame: number; fps: number }> = ({ items, frame, fps }) => {
  if (items.length === 0) return null;
  return (
    <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{ position: "absolute", inset: 0 }}>
      {items.map((it) => (
        <One key={it.key} item={it} frame={frame} fps={fps} />
      ))}
    </svg>
  );
};
