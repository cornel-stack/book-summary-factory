import type React from "react";

/** An SVG path `d` string in an element's own local viewBox coordinates. */
export type Stroke = string;

/** A colored fill region (drawn behind the outline strokes, wiped in). */
export type FillRegion = { d: string; color: string; opacity?: number };

/** A drawable shape: ordered strokes within a local viewBox. `fills` are
 *  colored regions (flat marker fills) revealed behind the strokes during the
 *  draw — the same two-step the cast uses (outline, then color wipe). */
export type Shape = {
  viewBox: { w: number; h: number };
  strokes: Stroke[];
  fills?: FillRegion[];
};

/**
 * One element placed on the board: a shape positioned in scene pixels, a time
 * at which the hand should begin drawing it, an optional keyword label, and an
 * optional "alive" overlay rendered (in local coords) once the drawing is done.
 */
export type BoardElement = {
  key: string;
  shape: Shape;
  /** Target box in scene pixels; the shape is uniformly scaled to fit + centered. */
  box: { x: number; y: number; w: number; h: number };
  /** Frame (within the scene) the drawing should start; honored if ≥ natural cursor. */
  startFrame: number;
  strokeColor?: string;
  strokeWidth?: number;
  label?: string;
  labelAnchor?: "bottom" | "top" | "inside" | "right" | "left";
  labelColor?: string;
  /** Absolute scene-px label position (overrides anchor); used by charts. */
  labelAt?: { x: number; y: number };
  /**
   * Rendered (in local viewBox coords) instead of the static finished strokes
   * once drawing completes. `scale` is the element's local→scene scale so the
   * overlay can keep stroke widths visually consistent.
   */
  alive?: (frameSinceDone: number, scale: number) => React.ReactNode;
  /**
   * Rendered behind the outline strokes during the draw phase — used by filled
   * cast characters to wipe their fills in over the last ~0.4s of the draw.
   */
  fillOverlay?: (ctx: { frame: number; drawEnd: number; scale: number }) => React.ReactNode;
};

/** One stroke scheduled on the global scene timeline (scene-relative frames). */
export type Segment = {
  elementKey: string;
  d: Stroke;
  offsetX: number;
  offsetY: number;
  scale: number;
  startFrame: number;
  endFrame: number;
  strokeColor: string;
  strokeWidth: number;
};

export type DrawPlan = {
  segments: Segment[];
  /** Per-element frame at which its last stroke finishes (scene-relative). */
  drawEndByKey: Record<string, number>;
  lastFrame: number;
};
