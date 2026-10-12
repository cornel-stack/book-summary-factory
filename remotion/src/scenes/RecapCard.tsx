import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { QuietBackdrop } from "../components/QuietBackdrop";
import { syncStartFrame } from "../drawing/layout";
import type { WordTiming } from "../schema";

type Item = { label: string; sync?: { phrase: string } };

/** Kinetic recap (Phase 16): numbered badges pop in + rows spring from the left. */
export const RecapCard: React.FC<{
  visual: { title?: string; items: Item[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const items = visual.items;

  const topY = visual.title ? 320 : 240;
  const step = Math.min(180, (VIDEO.height - topY - 150) / items.length);
  const titleOpacity = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <QuietBackdrop />
      {visual.title && (
        <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", fontFamily: FONTS.heading, fontSize: LAYOUT.titleSize * 0.7, color: COLORS.ink, opacity: titleOpacity }}>
          {visual.title}
        </div>
      )}
      {items.map((item, i) => {
        const start = item.sync ? syncStartFrame(words, item.sync, fps, 10 + i * 12) : 10 + i * 12;
        const t = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 150, mass: 0.7 } });
        const pop = spring({ frame: frame - start, fps, config: { damping: 11, stiffness: 170, mass: 0.6 } });
        const op = interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (op <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 360, top: topY + i * step, width: VIDEO.width - 360 - 200, display: "flex", alignItems: "center", gap: 44, opacity: op, transform: `translateX(${(1 - t) * -56}px)` }}>
            <div style={{ width: 104, height: 104, flex: "0 0 auto", borderRadius: "50%", border: `7px solid ${brand.accent}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${Math.max(0.01, Math.min(1.08, pop))})` }}>
              <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 60, color: brand.accent }}>{i + 1}</span>
            </div>
            <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: 76, color: COLORS.ink }}>{item.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
