import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { QuietBackdrop } from "../components/QuietBackdrop";
import { listIcon } from "../drawing/icons";
import { syncStartFrame } from "../drawing/layout";
import type { WordTiming } from "../schema";

type Item = { label: string; icon: "tick" | "box" | "arrow"; sync?: { phrase: string } };

function hexA(hex: string, a: number) {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return `${hex}${aa}`;
}

/** Kinetic list (Phase 16): rows spring in from the left, staggered, with an
 *  icon chip — show the list on screen instead of narrating it unseen. */
export const ListCard: React.FC<{
  visual: { title?: string; items: Item[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const items = visual.items;

  const topY = visual.title ? 320 : 230;
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
        const op = interpolate(frame, [start, start + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (op <= 0) return null;
        const icon = listIcon(item.icon);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 380,
              top: topY + i * step,
              width: VIDEO.width - 380 - 200,
              display: "flex",
              alignItems: "center",
              gap: 40,
              opacity: op,
              transform: `translateX(${(1 - t) * -56}px)`,
            }}
          >
            <div style={{ width: 100, height: 100, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: hexA(brand.accent, 0.12), borderRadius: 22 }}>
              <svg width={62} height={62} viewBox="0 0 100 100">
                {icon.strokes.map((d, k) => (
                  <path key={k} d={d} fill="none" stroke={brand.accent} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            </div>
            <div style={{ fontFamily: FONTS.body, fontWeight: 800, fontSize: 78, color: COLORS.ink }}>{item.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
