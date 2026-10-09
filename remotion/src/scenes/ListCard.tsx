import { QuietBackdrop } from "../components/QuietBackdrop";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { DrawingBoard } from "../components/DrawingBoard";
import { listIcon } from "../drawing/icons";
import { syncStartFrame } from "../drawing/layout";
import type { BoardElement } from "../drawing/types";
import type { WordTiming } from "../schema";

type Item = { label: string; icon: "tick" | "box" | "arrow"; sync?: { phrase: string } };

export const ListCard: React.FC<{
  visual: { title?: string; items: Item[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();

  const hasTitle = Boolean(visual.title);
  const topY = hasTitle ? 330 : 250;
  const step = Math.min(170, (VIDEO.height - topY - 160) / visual.items.length);
  const iconX = 420;

  const elements: BoardElement[] = visual.items.map((item, i) => ({
    key: `item-${i}`,
    shape: listIcon(item.icon),
    box: { x: iconX, y: topY + i * step, w: 92, h: 92 },
    startFrame: syncStartFrame(words, item.sync, fps, 0),
    strokeColor: brand.accent,
    strokeWidth: 8,
    label: item.label,
    labelAnchor: "right",
    labelColor: COLORS.ink,
  }));

  const titleOpacity = interpolate(frame, [4, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <QuietBackdrop />
      {visual.title && (
        <div
          style={{
            position: "absolute",
            top: 120,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontSize: LAYOUT.titleSize * 0.7,
            color: COLORS.ink,
            opacity: titleOpacity,
          }}
        >
          {visual.title}
        </div>
      )}
      <DrawingBoard elements={elements} />
    </AbsoluteFill>
  );
};
