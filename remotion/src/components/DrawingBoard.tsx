import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, DRAW, FONTS, LAYOUT } from "../theme";
import { buildPlan, computeHand } from "../drawing/plan";
import type { BoardElement, Segment } from "../drawing/types";
import { DrawPath } from "./DrawPath";
import { DrawingHand } from "./DrawingHand";
import { PhotoHand } from "./PhotoHand";
import { HAS_PHOTO_HAND } from "../drawing/handConfig";

type ElementView = {
  el: BoardElement;
  segs: Segment[];
  offsetX: number;
  offsetY: number;
  scale: number;
  drawEnd: number;
};

const FILL_REVEAL_FRAMES = 12; // ~0.4s color wipe behind a prop's outline

/** Colored marker fills for a prop, wiped in (left→right) over the last ~0.4s
 *  of its draw and held after — the same two-step the cast uses. */
const FillsReveal: React.FC<{ el: BoardElement; drawEnd: number; frame: number }> = ({ el, drawEnd, frame }) => {
  const fills = el.shape.fills;
  if (!fills || fills.length === 0) return null;
  const progress = Math.max(0, Math.min(1, (frame - (drawEnd - FILL_REVEAL_FRAMES)) / FILL_REVEAL_FRAMES));
  if (progress <= 0) return null;
  const W = el.shape.viewBox.w;
  const soft = W * 0.14;
  const gid = `fillrev-${el.key}`;
  const wipeX = -soft + progress * (W + 2 * soft);
  const o1 = Math.max(0, Math.min(1, (wipeX - soft) / W));
  const o2 = Math.max(0, Math.min(1, (wipeX + soft) / W));
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset={o1} stopColor="white" />
          <stop offset={o2} stopColor="black" />
        </linearGradient>
        <mask id={`${gid}-m`}>
          <rect x={-soft} y={-soft} width={W + 2 * soft} height={el.shape.viewBox.h + 2 * soft} fill={`url(#${gid})`} />
        </mask>
      </defs>
      <g mask={`url(#${gid}-m)`}>
        {fills.map((f, i) => (
          <path key={i} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />
        ))}
      </g>
    </>
  );
};

/**
 * The hand-drawing engine. Given positioned, time-scheduled elements, it draws
 * each stroke in sequence with the hand tracking the pen tip, swaps finished
 * drawings for their "alive" overlay, and fades in keyword labels. One scene
 * can host several boards, but usually passes all its elements to one.
 */
export const DrawingBoard: React.FC<{ elements: BoardElement[] }> = ({ elements }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const plan = useMemo(() => buildPlan(elements, fps), [elements, fps]);

  const views: ElementView[] = useMemo(() => {
    return elements.map((el) => {
      const segs = plan.segments.filter((s) => s.elementKey === el.key);
      const first = segs[0];
      // Elements with no strokes (e.g. walk-in figures, which stride in alive
      // and are never drawn) have no segments — fit the viewBox into the box
      // exactly as the plan would, so the alive overlay is placed + scaled right.
      const vb = el.shape.viewBox;
      const fitScale = Math.min(el.box.w / vb.w, el.box.h / vb.h);
      return {
        el,
        segs,
        offsetX: first?.offsetX ?? el.box.x + (el.box.w - vb.w * fitScale) / 2,
        offsetY: first?.offsetY ?? el.box.y + (el.box.h - vb.h * fitScale) / 2,
        scale: first?.scale ?? fitScale,
        drawEnd: plan.drawEndByKey[el.key] ?? 0,
      };
    });
  }, [elements, plan]);

  const hand = computeHand(frame, plan.segments, width, height, fps);

  return (
    <AbsoluteFill>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {views.map((v) => {
          const sw = (v.el.strokeWidth ?? 5) / v.scale;
          const color = v.el.strokeColor ?? COLORS.ink;
          const done = frame >= v.drawEnd;
          return (
            <g
              key={v.el.key}
              transform={`translate(${v.offsetX} ${v.offsetY}) scale(${v.scale})`}
            >
              {done && v.el.alive ? (
                v.el.alive(frame - v.drawEnd, v.scale)
              ) : (
                <>
                  {/* colored marker fills wipe in behind the outline (props) */}
                  <FillsReveal el={v.el} drawEnd={v.drawEnd} frame={frame} />
                  {/* fills wipe in behind the outline strokes (cast characters) */}
                  {v.el.fillOverlay?.({ frame, drawEnd: v.drawEnd, scale: v.scale })}
                  {v.segs.map((s, i) =>
                    frame < s.startFrame ? null : (
                      <DrawPath
                        key={i}
                        d={s.d}
                        color={color}
                        strokeWidth={sw}
                        progress={Math.max(
                          0,
                          Math.min(1, (frame - s.startFrame) / (s.endFrame - s.startFrame)),
                        )}
                      />
                    ),
                  )}
                </>
              )}
            </g>
          );
        })}

        {!HAS_PHOTO_HAND && <DrawingHand hand={hand} />}
      </svg>

      {/* Photographed hand overlay (falls back to the vector hand above). */}
      {HAS_PHOTO_HAND && <PhotoHand hand={hand} />}

      {/* Keyword labels (HTML for crisp Caveat text), fade in after drawing. */}
      {views.map((v) => {
        if (!v.el.label) return null;
        const t = Math.max(
          0,
          Math.min(1, (frame - v.drawEnd) / DRAW.labelFadeFrames),
        );
        if (t <= 0) return null;
        const anchor = v.el.labelAnchor ?? "bottom";
        const b = v.el.box;
        let left = b.x - 40;
        let top = b.y + b.h + 6;
        let width = b.w + 80;
        let textAlign: "center" | "left" = "center";
        if (v.el.labelAt) {
          left = v.el.labelAt.x - 160;
          top = v.el.labelAt.y - LAYOUT.labelSize / 2;
          width = 320;
        } else if (anchor === "top") {
          top = b.y - 70;
        } else if (anchor === "inside") {
          top = b.y + b.h / 2 - 30;
        } else if (anchor === "right") {
          left = b.x + b.w + 24;
          top = b.y + b.h / 2 - LAYOUT.labelSize * 0.7;
          width = 900;
          textAlign = "left";
        } else if (anchor === "left") {
          left = b.x - 924;
          top = b.y + b.h / 2 - LAYOUT.labelSize * 0.7;
          width = 900;
          textAlign = "left";
        }
        return (
          <div
            key={v.el.key}
            style={{
              position: "absolute",
              left,
              top,
              width,
              textAlign,
              fontFamily: FONTS.label,
              fontSize: LAYOUT.labelSize,
              color: v.el.labelColor ?? COLORS.ink,
              opacity: t,
              transform: `translateY(${(1 - t) * 8}px)`,
            }}
          >
            {v.el.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
