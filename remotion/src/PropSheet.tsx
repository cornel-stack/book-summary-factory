import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { propShape, type PropKind } from "./drawing/props";

const KINDS: PropKind[] = [
  "mountain", "path", "staircase", "scale", "hourglass", "clock", "calendar", "trophy",
  "target", "seedling", "sapling", "tree", "brain", "heart", "gears", "ladder",
  "wall", "gift", "phone", "bed", "dumbbell", "shoe", "coffee", "snowball",
  "house", "book", "moneybag", "lightbulb", "desk", "door", "easel", "speech",
];

const Cell: React.FC<{ kind: PropKind; cx: number; cy: number; box: number }> = ({ kind, cx, cy, box }) => {
  const s = propShape(kind, { state: "on", variant: kind === "door" ? "open" : undefined });
  const sc = Math.min(box / s.viewBox.w, box / s.viewBox.h);
  const tx = cx - (s.viewBox.w * sc) / 2;
  const ty = cy - (s.viewBox.h * sc) / 2;
  const sw = 3 / sc;
  return (
    <g transform={`translate(${tx} ${ty}) scale(${sc})`}>
      {s.fills?.map((f, i) => (
        <path key={`fl${i}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />
      ))}
      {s.strokes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
};

export const PropSheet: React.FC = () => {
  const cols = 8;
  const cw = 1920 / cols;
  const rows = Math.ceil(KINDS.length / cols);
  const ch = (1080 - 60) / rows;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <text x={40} y={44} fontFamily={FONTS.heading} fontSize={40} fill={COLORS.ink}>Prop & metaphor library</text>
        {KINDS.map((k, i) => {
          const cx = (i % cols) * cw + cw / 2;
          const cy = 70 + Math.floor(i / cols) * ch + ch / 2 - 14;
          return (
            <React.Fragment key={k}>
              <Cell kind={k} cx={cx} cy={cy} box={ch * 0.72} />
              <text x={cx} y={70 + Math.floor(i / cols) * ch + ch - 10} textAnchor="middle" fontFamily={FONTS.label} fontSize={22} fill={COLORS.flame}>{k}</text>
            </React.Fragment>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
