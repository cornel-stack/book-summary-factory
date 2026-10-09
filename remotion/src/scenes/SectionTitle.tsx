import { QuietBackdrop } from "../components/QuietBackdrop";
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { DrawingBoard } from "../components/DrawingBoard";
import { circleBadge, underline } from "../drawing/icons";
import { syncStartFrame } from "../drawing/layout";
import type { BoardElement } from "../drawing/types";
import type { WordTiming } from "../schema";

export const SectionTitle: React.FC<{
  visual: {
    role?: "part" | "principle";
    number?: number;
    part?: number;
    title: string;
    emphasis: "underline" | "circle";
    sync?: { phrase: string };
  };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const { fps } = useVideoConfig();

  const cx = VIDEO.width / 2;
  const cy = VIDEO.height / 2;

  const titleOpacity = interpolate(frame, [6, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [6, 20], [36, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Approximate title width to size the marker (no text metrics at render time).
  const approxW = Math.min(
    VIDEO.width - LAYOUT.safeMargin * 2,
    Math.max(360, visual.title.length * LAYOUT.titleSize * 0.42),
  );
  const markerStart = syncStartFrame(words, visual.sync, fps, 18);

  // Book-structure kicker: "PART n" / "PRINCIPLE n" above the title (replaces
  // the plain circle badge, which stays for role-less section titles).
  const kicker = visual.role
    ? `${visual.role.toUpperCase()}${visual.number !== undefined ? ` ${visual.number}` : ""}`
    : null;

  const elements: BoardElement[] = [];
  if (visual.number !== undefined && !visual.role) {
    elements.push({
      key: "badge",
      shape: circleBadge(),
      box: { x: cx - 55, y: cy - 240, w: 110, h: 110 },
      startFrame: 4,
      strokeColor: brand.accent,
      strokeWidth: 6,
      label: String(visual.number),
      labelAnchor: "inside",
      labelColor: brand.accent,
    });
  }
  elements.push({
    key: "marker",
    shape:
      visual.emphasis === "circle"
        ? { viewBox: { w: approxW + 80, h: 200 }, strokes: [ellipse(approxW + 80, 200)] }
        : underline(approxW),
    box:
      visual.emphasis === "circle"
        ? { x: cx - (approxW + 80) / 2, y: cy - 110, w: approxW + 80, h: 200 }
        : { x: cx - approxW / 2, y: cy + 60, w: approxW, h: 40 },
    startFrame: markerStart,
    strokeColor: brand.accent,
    strokeWidth: 9,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      <QuietBackdrop />
      {kicker && (
        <div
          style={{
            position: "absolute",
            top: cy - 210,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.label,
            fontSize: 46,
            letterSpacing: 8,
            color: brand.accent,
            opacity: titleOpacity,
          }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: cy - 120,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: LAYOUT.titleSize,
          color: COLORS.ink,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {visual.title}
      </div>
      <DrawingBoard elements={elements} />
    </AbsoluteFill>
  );
};

function ellipse(w: number, h: number): string {
  const rx = w / 2 - 6;
  const ry = h / 2 - 6;
  const cx = w / 2;
  const cy = h / 2;
  return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
}
