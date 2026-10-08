import type { Shape } from "./types";
import { circlePath } from "./stick";

/** Small hand-drawable icons for list/recap/section scenes. */

export function listIcon(kind: "tick" | "box" | "arrow"): Shape {
  if (kind === "box") {
    return { viewBox: { w: 100, h: 100 }, strokes: [`M 16 16 L 84 16 L 84 84 L 16 84 Z`] };
  }
  if (kind === "arrow") {
    return {
      viewBox: { w: 100, h: 100 },
      strokes: [`M 10 50 L 82 50`, `M 58 30 L 88 50 L 58 70`],
    };
  }
  // tick
  return { viewBox: { w: 100, h: 100 }, strokes: [`M 12 54 L 40 82 L 92 16`] };
}

/** A numbered circle (the number itself is drawn as a label). */
export function circleBadge(): Shape {
  return { viewBox: { w: 100, h: 100 }, strokes: [circlePath(50, 50, 42)] };
}

/** One big opening quotation mark (two drawn commas). */
export function quoteMark(): Shape {
  const comma = (dx: number) =>
    `M ${22 + dx} 14 C ${8 + dx} 16 ${6 + dx} 40 ${18 + dx} 46 ` +
    `C ${26 + dx} 50 ${24 + dx} 40 ${18 + dx} 40 ` +
    `C ${12 + dx} 40 ${14 + dx} 22 ${24 + dx} 22 Z`;
  return { viewBox: { w: 110, h: 70 }, strokes: [comma(0), comma(46)] };
}

/** A marker underline (slightly wavy) spanning a given local width. */
export function underline(width: number): Shape {
  const w = width;
  return {
    viewBox: { w, h: 24 },
    strokes: [`M 2 14 Q ${w * 0.3} 4 ${w * 0.5} 12 T ${w - 2} 10`],
  };
}
