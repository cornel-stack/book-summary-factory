import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "./theme";
import { CAST, castFigureRender, type CastId, type SeatKind } from "./drawing/cast";
import { CastStatic, fillColor } from "./components/CastFigure";

const IDS: CastId[] = ["alex", "sage", "max", "maya", "pip"];
const W = 1920;
const H = 1080;

const Label: React.FC<{ x: number; y: number; t: string; c?: string; s?: number; anchor?: "start" | "middle" }> = ({
  x,
  y,
  t,
  c = COLORS.flame,
  s = 26,
  anchor = "middle",
}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONTS.label} fontSize={s} fill={c}>
    {t}
  </text>
);

/** One figure at an explicit horizontal squash — proves the turn's narrow
 *  frames render a clean simplified state (no face / accents below ~25%). */
const TurnFrame: React.FC<{ id: CastId; view: "front" | "side"; squashX: number; cx: number; feetY: number; base: number }> = ({
  id,
  view,
  squashX,
  cx,
  feetY,
  base,
}) => {
  const scale = base * CAST[id].heightScale;
  const simplified = squashX < 0.25;
  const r = castFigureRender(CAST[id], "standing", { view, simplified });
  const sw = 2 / scale;
  const tx = cx - 50 * scale;
  const ty = feetY - 192 * scale;
  return (
    <g transform={`translate(${tx} ${ty}) scale(${scale}) translate(50 0) scale(${squashX} 1) translate(-50 0)`}>
      {r.fills.map((p, i) => (
        <path key={i} d={p.d} fill={fillColor(p.fill)} fillRule="evenodd" stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      {r.face.map((d, i) => (
        <path key={`f${i}`} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw * 1.4} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  );
};

export const CastSideSheet: React.FC = () => {
  const colX = [300, 620, 940, 1260, 1580];
  // Sage sits at a desk (mentor), everyone else on a chair — the seat default.
  const seatFor = (id: CastId): SeatKind => (id === "sage" ? "desk" : "chair");
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <text x={80} y={58} fontFamily={FONTS.heading} fontSize={50} fill={COLORS.ink}>
          The Cast · Side View
        </text>

        {/* row 1: standing-side */}
        <Label x={120} y={120} t="standing" anchor="start" />
        {IDS.map((id, i) => (
          <CastStatic key={id} id={id} pose="standing" view="side" expression="happy" cx={colX[i]!} feetY={235} base={0.48} />
        ))}

        {/* row 2: walking-side (new inkFar far-limb tint) */}
        <Label x={120} y={320} t="walking" anchor="start" />
        {IDS.map((id, i) => (
          <CastStatic key={id} id={id} pose="walking" expression="happy" cx={colX[i]!} feetY={455} base={0.48} />
        ))}

        {/* row 3: sitting-side — every figure sits ON a seat (chair; Sage at a desk) */}
        <Label x={120} y={545} t="sitting" anchor="start" />
        {IDS.map((id, i) => (
          <CastStatic key={id} id={id} pose="sitting" expression="happy" seat={seatFor(id)} cx={colX[i]!} feetY={680} base={0.46} />
        ))}
        {IDS.map((id, i) => (
          <Label key={id} x={colX[i]!} y={720} t={CAST[id].name} c={COLORS.inkSoft} s={22} />
        ))}

        {/* row 4: side-view silhouette lineup — must pass the no-face ID test */}
        <line x1={80} y1={760} x2={W - 80} y2={760} stroke={COLORS.inkSoft} strokeWidth={1} opacity={0.4} />
        <Label x={W / 2} y={792} t="side silhouette test — identifiable with no face" s={26} />
        {IDS.map((id, i) => (
          <CastStatic key={id} id={id} pose="standing" view="side" expression="happy" silhouette cx={colX[i]!} feetY={915} base={0.46} />
        ))}

        {/* row 5: the turn (side → front), clean through the narrow frames */}
        <Label x={W / 2} y={965} t="the turn — side → front (narrowest frames simplified: body + hair only)" c={COLORS.inkSoft} s={24} />
        {[
          { v: "side" as const, sx: 1 },
          { v: "side" as const, sx: 0.5 },
          { v: "side" as const, sx: 0.14 },
          { v: "front" as const, sx: 0.14 },
          { v: "front" as const, sx: 0.5 },
          { v: "front" as const, sx: 1 },
        ].map((f, i) => (
          <TurnFrame key={i} id="max" view={f.v} squashX={f.sx} cx={720 + i * 110} feetY={1065} base={0.42} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
