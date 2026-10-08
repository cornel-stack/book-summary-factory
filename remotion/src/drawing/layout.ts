import { GRID, LAYOUT, VIDEO } from "../theme";
import { resolvePhraseTime, type Word } from "./sync";

/** A grid cell (12 cols × 6 rows) over the safe content area → scene px box. */
export function gridBox(at: { col: number; row: number; w: number; h: number }) {
  const m = LAYOUT.safeMargin;
  const cw = (VIDEO.width - 2 * m) / GRID.cols;
  const ch = (VIDEO.height - 2 * m) / GRID.rows;
  return {
    x: m + at.col * cw,
    y: m + at.row * ch,
    w: at.w * cw,
    h: at.h * ch,
  };
}

/**
 * Resolve an element's start frame (scene-relative). If a sync phrase is given
 * and found, start when it's spoken; otherwise fall back (0 → chains in order).
 */
export function syncStartFrame(
  words: Word[],
  sync: { phrase: string } | undefined,
  fps: number,
  fallback = 0,
): number {
  if (sync) {
    const t = resolvePhraseTime(words, sync.phrase);
    if (t !== null) return Math.round(t * fps);
  }
  return fallback;
}
