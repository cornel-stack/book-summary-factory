/**
 * Vertical-native layout for social videos (1080×1920). The vertical renderer
 * OWNS all geometry in frame pixels and ignores the authored 16:9 grid `at`
 * (which only exists to satisfy the shared schema). Everything here is pure —
 * no JSX — so it can be unit-reasoned and reused by every vertical scene.
 *
 * Vertical budget (from theme.SHORT_SAFE 220/320/60):
 *   content zone  y ∈ [220 .. 1600]
 *   caption rail  chip sits ~[1450 .. 1550] (BurnedCaptions draws at bottom-150)
 *   so ART must stay above ART_BOTTOM; figures stand on FLOOR_Y.
 */
import { SHORT_SAFE, VIDEO_VERTICAL } from "../theme";

export const VW = VIDEO_VERTICAL.width; // 1080
export const VH = VIDEO_VERTICAL.height; // 1920

export const CONTENT_TOP = SHORT_SAFE.top; // 220
/** `bottom` passed to BurnedCaptions (caption rail top reference). */
export const CONTENT_BOTTOM_EDGE = VH - SHORT_SAFE.bottom; // 1600
export const FLOOR_Y = 1360; // figure feet line (clear of the caption chip)
export const ART_BOTTOM = 1430; // hard lower bound for any art (above the chip)

export type Box = { x: number; y: number; w: number; h: number };

/**
 * Hero figure box. BIG + centered by default (feet on FLOOR_Y). Lowered +
 * slightly smaller when the scene also shows a top prop or the 2s hook overlay,
 * so the head clears whatever sits up top.
 */
export function heroFigureBox(opts: { lowered?: boolean } = {}): Box {
  if (opts.lowered) return { x: 300, y: 560, w: 480, h: FLOOR_Y - 560 }; // h=800
  return { x: 280, y: 320, w: 520, h: FLOOR_Y - 320 }; // h=1040 (exact 5.2× the 100×200 figure)
}

/** Two figures side by side, feet on the floor, facing inward. */
export function duoFigureBox(index: number): Box {
  const w = 420;
  const h = 840;
  const y = FLOOR_Y - h; // 520
  return index === 0 ? { x: 70, y, w, h } : { x: VW - 70 - w, y, w, h };
}

/** Top-zone metaphor prop box (above a lowered figure). */
export function metaphorBox(opts: { hasTitle?: boolean; count?: number; index?: number } = {}): Box {
  const count = opts.count ?? 1;
  const index = opts.index ?? 0;
  if (count > 1) {
    const size = 240;
    const span = 300;
    const totalW = count * span;
    const x = VW / 2 - totalW / 2 + index * span + (span - size) / 2;
    return { x, y: 280, w: size, h: size };
  }
  const h = opts.hasTitle ? 220 : 300;
  const y = opts.hasTitle ? 310 : 240;
  const w = opts.hasTitle ? 320 : 380;
  return { x: (VW - w) / 2, y, w, h };
}

/**
 * Off-edge slide (in the figure's LOCAL units) for a walk-in entrance — the
 * 1080-correct version of CharacterScene.enterSlideFor (which hardcodes 1920).
 */
export function verticalEnterSlide(box: Box, flip: boolean): number {
  const s = Math.min(box.w / 100, box.h / 200);
  const offsetX = box.x + (box.w - 100 * s) / 2;
  return flip ? (VW - offsetX) / s + 10 : -(offsetX / s + 110);
}

/** Vertical typographic rhythm constants (text scenes). */
export const TEXT = {
  titleY: 300,
  titleSize: 110,
  kickerY: 430,
  heroTitleY: 700,
  heroTitleSize: 150,
  listStartY: 580,
  listStep: 196,
  listIconX: 130,
  listLabelX: 270,
  listLabelSize: 66,
  quoteSize: 92,
} as const;
