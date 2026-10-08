import { QuietBackdrop } from "../components/QuietBackdrop";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { DrawingBoard } from "../components/DrawingBoard";
import { castBoardElement } from "../components/CastCharacter";
import { quoteMark, underline } from "../drawing/icons";
import type { CastId } from "../drawing/cast";
import type { BoardElement } from "../drawing/types";

/** Split a quote into readable lines of ~6 words. */
function toLines(quote: string, perLine = 6): string[] {
  const words = quote.split(/\s+/);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += perLine) {
    lines.push(words.slice(i, i + perLine).join(" "));
  }
  return lines;
}

export const QuoteCard: React.FC<{
  visual: { quote: string; attribution: string; cast?: CastId };
}> = ({ visual }) => {
  const frame = useCurrentFrame();
  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;
  const lines = toLines(visual.quote);

  const attribW = Math.max(300, visual.attribution.length * LAYOUT.attributionSize * 0.42);
  const lastLineFade = 24 + lines.length * 10;

  const elements: BoardElement[] = [
    {
      key: "marks",
      shape: quoteMark(),
      box: { x: LAYOUT.safeMargin + 40, y: cy - 300, w: 260, h: 165 },
      startFrame: 0,
      strokeColor: COLORS.flameSoft,
      strokeWidth: 5,
    },
    {
      key: "attrib-underline",
      shape: underline(attribW),
      box: { x: cx - attribW / 2, y: cy + 250, w: attribW, h: 34 },
      startFrame: lastLineFade,
      strokeColor: COLORS.flame,
      strokeWidth: 7,
    },
  ];

  // Optional: the quoted author delivers the line, presenting from the left
  // margin (hand-drawn, then alive). Sits below the quote marks, clear of text.
  if (visual.cast) {
    elements.push(
      castBoardElement({
        key: "speaker",
        castId: visual.cast,
        box: { x: 150, y: 560, w: 300, h: 440 },
        startFrame: 10,
        sceneFrame: frame,
        poses: ["presenting"],
        expressions: ["happy"],
        seed: "quote-speaker",
      }),
    );
  }

  const attribOpacity = interpolate(frame, [lastLineFade - 6, lastLineFade + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.paper }}>
      <QuietBackdrop />
      <DrawingBoard elements={elements} />
      <div
        style={{
          position: "absolute",
          top: cy - 190,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontSize: LAYOUT.quoteSize,
          color: COLORS.ink,
          lineHeight: LAYOUT.lineHeight,
        }}
      >
        {lines.map((line, i) => {
          const start = 20 + i * 10;
          const op = interpolate(frame, [start, start + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={i} style={{ opacity: op }}>
              {line}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          top: cy + 170,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.label,
          fontSize: LAYOUT.attributionSize,
          color: COLORS.flame,
          opacity: attribOpacity,
        }}
      >
        — {visual.attribution}
      </div>
    </AbsoluteFill>
  );
};
