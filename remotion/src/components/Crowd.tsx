import React from "react";
import { interpolate } from "remotion";
import { VIDEO, SCENE_TINT } from "../theme";
import { seeded } from "../drawing/motion";
import { peepsHeadParts } from "../drawing/peepsHead";

/**
 * Crowd tier (Phase 9): a background "crowd" of whole Open Peeps figures
 * (CC0 — see remotion/assets/peeps/LICENSE.md), tinted to a single flat tone so
 * they recede behind the cast and never compete. Deterministic part selection
 * from a scene-id seed; reveal is always a soft wash/fade, NEVER the hand.
 */
export type CrowdArrangement = "row" | "cluster" | "queue";

const HAIRS = ["Short", "Bun", "Bald", "ShortMessy", "Pomp", "MediumShort", "Long"];
const FACES = ["Calm", "Smile", "Suspicious", "Concerned"];

/** One tinted Peeps figure (head + shoulders). */
const Member: React.FC<{ seed: string; x: number; y: number; s: number; tint: string }> = ({ seed, x, y, s, tint }) => {
  const hair = HAIRS[Math.floor(seeded(seed + "h") * HAIRS.length) % HAIRS.length]!;
  const face = FACES[Math.floor(seeded(seed + "f") * FACES.length) % FACES.length]!;
  const flip = seeded(seed + "x") > 0.6 ? -1 : 1;
  const parts = peepsHeadParts(hair, face);
  return (
    <g transform={`translate(${x} ${y}) scale(${s * flip} ${s}) translate(-442 -512)`}>
      {/* shoulders so each reads as a person, not a floating head */}
      <path d="M 300 560 Q 442 500 584 560 L 624 820 L 260 820 Z" fill={tint} opacity={0.92} />
      {parts.map((p, i) => (
        <g key={i} transform={`translate(${p.tx} ${p.ty})`}>
          <path d={p.d} fill={p.kind === "skin" ? "#FAF6EE" : tint} stroke={tint} strokeWidth={p.kind === "skin" ? 5 : 0} fillRule={p.evenodd ? "evenodd" : "nonzero"} />
        </g>
      ))}
    </g>
  );
};

export const Crowd: React.FC<{
  count: number;
  arrangement: CrowdArrangement;
  tint?: string;
  box: { x: number; y: number; w: number; h: number };
  seed: string;
  frame: number;
}> = ({ count, arrangement, tint = SCENE_TINT.sky, box, seed, frame }) => {
  const n = Math.max(2, Math.min(8, Math.round(count)));
  const op = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const baseY = box.y + box.h;
  const spots: { x: number; y: number; s: number }[] = [];
  const headPx = Math.min((box.w / n) * 0.9, box.h * 0.6);
  const s = headPx / 320; // Peeps head ~320 wide
  if (arrangement === "row") {
    for (let i = 0; i < n; i++) spots.push({ x: box.x + ((i + 0.5) * box.w) / n, y: baseY, s });
  } else if (arrangement === "cluster") {
    for (let i = 0; i < n; i++) {
      const back = i % 2 === 1;
      spots.push({ x: box.x + ((i + 0.5) * box.w) / n, y: baseY - (back ? box.h * 0.22 : 0), s: s * (back ? 0.82 : 1) });
    }
  } else {
    // queue: receding to the right, overlapping + shrinking
    for (let i = 0; i < n; i++) spots.push({ x: box.x + box.w * 0.12 + (i * box.w * 0.72) / n, y: baseY - i * box.h * 0.06, s: s * Math.pow(0.9, i) });
  }
  // nearer (bigger) members drawn last so they overlap correctly
  const ordered = spots.map((sp, i) => ({ sp, i })).sort((a, b) => a.sp.s - b.sp.s);
  return (
    <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{ position: "absolute", inset: 0, opacity: op }}>
      {ordered.map(({ sp, i }) => (
        <Member key={i} seed={`${seed}-${i}`} x={sp.x} y={sp.y} s={sp.s} tint={tint} />
      ))}
    </svg>
  );
};
