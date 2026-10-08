import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";

/**
 * Animated-effects language — small SVG animations that make actions *look*
 * like actions. Overlay kinds render above an anchor (usually a character's
 * head); the character-action kinds (shake/nod/headshake) are handled by
 * AliveCast instead. Each effect draws inside a 100×100 local viewBox
 * whose bottom-center sits at the anchor and extends upward.
 */
export type EffectKind =
  | "thought_bubble"
  | "question_marks"
  | "exclamation"
  | "idea_flash"
  | "sweat_drop"
  | "anger_marks"
  | "zzz"
  | "sparkles"
  | "motion_lines"
  | "money"
  // character actions (applied by AliveCast, not drawn here):
  | "shake"
  | "nod"
  | "headshake";

export const CHARACTER_ACTION_EFFECTS: EffectKind[] = ["shake", "nod", "headshake"];

const ink = COLORS.ink;
const accent = COLORS.flame;
const marker = COLORS.marker;

const Dot = (x: number, y: number, r: number, fill = ink, op = 1) => (
  <circle cx={x} cy={y} r={r} fill={fill} opacity={op} />
);

export const Effect: React.FC<{
  kind: EffectKind;
  x: number; // anchor scene px
  y: number;
  size: number; // scene px (width/height of the 100-unit box)
  frame: number; // absolute scene frame
  startFrame: number;
  loop?: boolean;
  duration?: number;
}> = ({ kind, x, y, size, frame, startFrame, loop = false, duration }) => {
  const { fps } = useVideoConfig();
  const local = frame - startFrame;
  const life = duration ?? (loop ? 9999 : 55);
  if (local < 0 || (!loop && local > life + 20)) return null;

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    left: x - size / 2,
    top: y - size,
    width: size,
    height: size,
    pointerEvents: "none",
    overflow: "visible",
  };

  const content = () => {
    switch (kind) {
      case "thought_bubble": {
        const dots = [0, 1, 2].map((i) => {
          const op = interpolate(local, [i * 5, i * 5 + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <g key={i}>{Dot(50 - i * 6, 82 - i * 12, 3 + i, ink, op)}</g>;
        });
        const cop = interpolate(local, [16, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <g>
            {dots}
            <g opacity={cop} fill="none" stroke={ink} strokeWidth={3}>
              <circle cx={40} cy={40} r={20} fill={COLORS.paper} />
              <circle cx={62} cy={34} r={15} fill={COLORS.paper} />
              <circle cx={66} cy={52} r={13} fill={COLORS.paper} />
              <circle cx={30} cy={52} r={12} fill={COLORS.paper} />
            </g>
          </g>
        );
      }
      case "question_marks": {
        return (
          <>
            {[0, 1, 2].map((i) => {
              const st = i * 8;
              const op = interpolate(local, [st, st + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const yb = 70 - i * 22 + Math.sin((local - st) / 6) * 2;
              return (
                <text key={i} x={38 + i * 16} y={yb} fontFamily={FONTS.heading} fontSize={40} fill={accent} opacity={op}>
                  ?
                </text>
              );
            })}
          </>
        );
      }
      case "exclamation": {
        const sc = spring({ frame: local, fps, config: { damping: 8, stiffness: 180 } });
        const shake = local < 14 ? Math.sin(local * 2.2) * 3 : 0;
        return (
          <g transform={`translate(${50 + shake} 50) scale(${sc})`}>
            <text x={0} y={22} textAnchor="middle" fontFamily={FONTS.heading} fontSize={62} fill={accent}>
              !
            </text>
          </g>
        );
      }
      case "idea_flash": {
        const on = Math.floor(local / 4) % 2 === 0 || local > 20;
        const rayLen = interpolate(local, [18, 28], [0, 14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <g>
            <g fill="none" stroke={on ? accent : ink} strokeWidth={3} opacity={on ? 1 : 0.5}>
              <circle cx={50} cy={48} r={18} fill={on ? marker : COLORS.paper} />
              <path d="M 42 60 L 58 60" />
              <path d="M 44 66 L 56 66" />
              <path d="M 46 42 L 50 36 L 54 42" />
            </g>
            {on &&
              [0, 1, 2, 3, 4, 5].map((i) => {
                const a = (i / 6) * Math.PI * 2;
                return (
                  <line key={i} x1={50 + Math.cos(a) * 24} y1={48 + Math.sin(a) * 24} x2={50 + Math.cos(a) * (24 + rayLen)} y2={48 + Math.sin(a) * (24 + rayLen)} stroke={accent} strokeWidth={3} strokeLinecap="round" />
                );
              })}
          </g>
        );
      }
      case "sweat_drop": {
        const yb = interpolate(local, [0, 26], [20, 80], { extrapolateRight: "clamp" });
        const op = interpolate(local, [0, 4, 22, 28], [0, 1, 1, 0], { extrapolateRight: "clamp" });
        return (
          <g opacity={op} transform={`translate(70 ${yb})`}>
            <path d="M 0 -10 C 8 2 8 12 0 12 C -8 12 -8 2 0 -10 Z" fill={COLORS.paper} stroke={ink} strokeWidth={2.5} />
          </g>
        );
      }
      case "anger_marks": {
        const pulse = 1 + Math.sin(local / 3) * 0.12;
        return (
          <g transform={`translate(60 30) scale(${pulse})`} stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round">
            <path d="M 0 0 L 14 0 M 7 -7 L 7 7" />
            <path d="M 2 10 L 12 10 M 7 5 L 7 15" transform="rotate(20 7 10)" />
          </g>
        );
      }
      case "zzz": {
        return (
          <>
            {[0, 1, 2].map((i) => {
              const t = (local + i * 14) % 42;
              const op = interpolate(t, [0, 6, 34, 42], [0, 1, 1, 0]);
              return (
                <text key={i} x={46 + t * 0.7} y={60 - t * 0.9} fontFamily={FONTS.heading} fontSize={18 + i * 8} fill={ink} opacity={op}>
                  z
                </text>
              );
            })}
          </>
        );
      }
      case "sparkles": {
        return (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2;
              const d = interpolate(local, [0, 18], [0, 34], { extrapolateRight: "clamp" });
              const op = interpolate(local, [0, 6, 30, 42], [0, 1, 1, 0], { extrapolateRight: "clamp" });
              const px = 50 + Math.cos(a) * d;
              const py = 45 + Math.sin(a) * d;
              return (
                <text key={i} x={px} y={py} textAnchor="middle" fontSize={18} fill={i % 2 ? accent : marker} opacity={op}>
                  ★
                </text>
              );
            })}
          </>
        );
      }
      case "motion_lines": {
        const op = interpolate(local % 20, [0, 4, 14, 20], [0, 1, 1, 0]);
        return (
          <g stroke={COLORS.inkSoft} strokeWidth={4} strokeLinecap="round" opacity={op}>
            <path d="M 6 46 L 34 46" />
            <path d="M 2 60 L 26 60" />
            <path d="M 10 74 L 38 74" />
          </g>
        );
      }
      case "money": {
        return (
          <>
            {[0, 1, 2, 3].map((i) => {
              const t = (local + i * 11) % 44;
              const yb = interpolate(t, [0, 44], [-6, 92]);
              const op = interpolate(t, [0, 6, 34, 44], [0, 1, 1, 0]);
              const xb = 24 + i * 18 + Math.sin(t / 6) * 4;
              return (
                <g key={i} opacity={op} transform={`translate(${xb} ${yb})`}>
                  <circle r={10} fill={marker} stroke={ink} strokeWidth={2} />
                  <text x={0} y={5} textAnchor="middle" fontSize={13} fontFamily={FONTS.body} fill={ink}>
                    $
                  </text>
                </g>
              );
            })}
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div style={wrapStyle}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
        <g transform={`scale(1)`}>{content()}</g>
      </svg>
    </div>
  );
};
