import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "./theme";
import { PEEPS_HAIR, PEEPS_FACE, PEEPS_FACE_OFFSET } from "./drawing/peeps";

// Calibration: render a raw Open Peeps head (hair skin + hair + face) in its
// native head-group coords with a 100-unit grid, to find its bbox/center.
export const PeepsCalib: React.FC = () => {
  const hair = PEEPS_HAIR.Short!;
  const face = PEEPS_FACE.Calm!;
  const VB = 700;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={1080} height={1080} viewBox={`-50 -50 ${VB} ${VB}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <React.Fragment key={i}>
            <line x1={i * 100} y1={-50} x2={i * 100} y2={VB - 50} stroke="#ccc" strokeWidth={1} />
            <line x1={-50} y1={i * 100} x2={VB - 50} y2={i * 100} stroke="#ccc" strokeWidth={1} />
            <text x={i * 100 + 2} y={-30} fontSize={16} fill="#999">{i * 100}</text>
            <text x={-48} y={i * 100 - 4} fontSize={16} fill="#999">{i * 100}</text>
          </React.Fragment>
        ))}
        {hair.map((p, i) => (
          <g key={`h${i}`} transform={`translate(${p.tx} ${p.ty})`}>
            <path d={p.d} fill={p.role === "skin" ? COLORS.paper : COLORS.ink} stroke={COLORS.ink} strokeWidth={p.role === "skin" ? 3 : 0} fillRule={p.evenodd ? "evenodd" : "nonzero"} />
          </g>
        ))}
        {face.map((p, i) => (
          <g key={`f${i}`} transform={`translate(${PEEPS_FACE_OFFSET.x + p.tx} ${PEEPS_FACE_OFFSET.y + p.ty})`}>
            <path d={p.d} fill={COLORS.ink} fillRule={p.evenodd ? "evenodd" : "nonzero"} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
