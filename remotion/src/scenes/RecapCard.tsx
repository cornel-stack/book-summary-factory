import { QuietBackdrop } from "../components/QuietBackdrop";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { DrawingBoard } from "../components/DrawingBoard";
import { circleBadge, listIcon } from "../drawing/icons";
import { syncStartFrame } from "../drawing/layout";
import type { BoardElement } from "../drawing/types";
import type { WordTiming } from "../schema";

type Item = { label: string; sync?: { phrase: string } };

export const RecapCard: React.FC<{
  visual: { title?: string; items: Item[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();

  const hasTitle = Boolean(visual.title);
  const topY = hasTitle ? 320 : 240;
  const step = Math.min(180, (VIDEO.height - topY - 150) / visual.items.length);
  const circleX = 360;

  const elements: BoardElement[] = [];
  visual.items.forEach((item, i) => {
    const rowY = topY + i * step;
    elements.push({
      key: `num-${i}`,
      shape: circleBadge(),
      box: { x: circleX, y: rowY, w: 96, h: 96 },
      startFrame: syncStartFrame(words, item.sync, fps, 0),
      strokeColor: brand.accent,
      strokeWidth: 6,
      label: String(i + 1),
      labelAnchor: "inside",
      labelColor: brand.accent,
    });
    elements.push({
      key: `tick-${i}`,
      shape: listIcon("tick"),
      box: { x: circleX + 150, y: rowY + 8, w: 78, h: 78 },
      startFrame: 0, // chains right after its numbered circle
      strokeColor: COLORS.ink,
      strokeWidth: 8,
      label: item.label,
      labelAnchor: "right",
      labelColor: COLORS.ink,
    });
  });

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
