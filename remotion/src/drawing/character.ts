import type { Stroke } from "./types";
import { circlePath, type StickPose } from "./stick";

/**
 * Face + expression system shared by the Cast. (The LinePeople body geometry
 * that used to live here has been retired — the Cast in drawing/cast.ts is the
 * one character system. The Cast's FRONT face reuses `faceFeatures` below; its
 * profile face lives in cast.ts. Pose/expression sequencing helpers for the
 * alive renderer also live here.)
 */

export type Expression =
  | "neutral"
  | "happy"
  | "worried"
  | "shocked"
  | "angry"
  | "tired"
  | "curious";

const r = (n: number) => Math.round(n * 100) / 100;
const line = (a: [number, number], b: [number, number]): Stroke =>
  `M ${r(a[0])} ${r(a[1])} L ${r(b[0])} ${r(b[1])}`;

// ---------- face geometry ----------
type FaceSpec = {
  eye: "dot" | "wide" | "line";
  browInner: number; // dy in units of r (negative = up)
  browOuter: number;
  browAsymMul?: number; // multiply right brow raise (curious = one brow)
  mouth: "smile" | "frown" | "flat" | "open" | "smallo" | "wavy";
};

const FACES: Record<Expression, FaceSpec> = {
  neutral: { eye: "dot", browInner: 0, browOuter: 0, mouth: "flat" },
  happy: { eye: "dot", browInner: -0.06, browOuter: -0.1, mouth: "smile" },
  worried: { eye: "dot", browInner: -0.2, browOuter: 0.04, mouth: "wavy" },
  shocked: { eye: "wide", browInner: -0.24, browOuter: -0.24, mouth: "open" },
  angry: { eye: "dot", browInner: 0.14, browOuter: -0.06, mouth: "frown" },
  tired: { eye: "line", browInner: 0.02, browOuter: 0.06, mouth: "flat" },
  curious: { eye: "dot", browInner: -0.16, browOuter: -0.2, browAsymMul: 0, mouth: "smallo" },
};

function faceStrokes(
  head: [number, number, number],
  expr: Expression,
  opts: { blink?: boolean; look?: number } = {},
): { brows: Stroke[]; eyes: Stroke[]; mouth: Stroke } {
  const [cx, cy, rad] = head;
  const spec = FACES[expr];
  const eyeDX = rad * 0.42;
  const eyeY = cy - rad * 0.06;
  const look = (opts.look ?? 0) * rad * 0.18;
  const blink = opts.blink === true;
  const eyeR = spec.eye === "wide" ? rad * 0.2 : rad * 0.13;

  const eye = (sx: number): Stroke => {
    const ex = sx + look;
    if (blink || spec.eye === "line") return line([ex - eyeR, eyeY], [ex + eyeR, eyeY]);
    return circlePath(ex, eyeY, eyeR);
  };

  const browY = cy - rad * 0.42;
  const brow = (side: -1 | 1): Stroke => {
    const outerMul = side === 1 ? (spec.browAsymMul ?? 1) : 1;
    const inner: [number, number] = [cx + side * (eyeDX - rad * 0.14), browY + spec.browInner * rad * outerMul];
    const outer: [number, number] = [cx + side * (eyeDX + rad * 0.22), browY + spec.browOuter * rad * outerMul];
    return line(inner, outer);
  };

  const my = cy + rad * 0.5;
  const mw = rad * 0.5;
  let mouth: Stroke;
  switch (spec.mouth) {
    case "smile":
      mouth = `M ${r(cx - mw)} ${r(my - rad * 0.05)} Q ${cx} ${r(my + rad * 0.4)} ${r(cx + mw)} ${r(my - rad * 0.05)}`;
      break;
    case "frown":
      mouth = `M ${r(cx - mw)} ${r(my + rad * 0.2)} Q ${cx} ${r(my - rad * 0.2)} ${r(cx + mw)} ${r(my + rad * 0.2)}`;
      break;
    case "open":
      mouth = circlePath(cx, my + rad * 0.05, rad * 0.22);
      break;
    case "smallo":
      mouth = circlePath(cx, my, rad * 0.14);
      break;
    case "wavy":
      mouth = `M ${r(cx - mw)} ${r(my)} Q ${r(cx - mw * 0.3)} ${r(my - rad * 0.16)} ${cx} ${r(my)} Q ${r(cx + mw * 0.3)} ${r(my + rad * 0.16)} ${r(cx + mw)} ${r(my)}`;
      break;
    default:
      mouth = line([cx - mw * 0.7, my], [cx + mw * 0.7, my]);
  }

  return { brows: [brow(-1), brow(1)], eyes: [eye(cx - eyeDX), eye(cx + eyeDX)], mouth };
}

/** Flat list of front-view face feature strokes — used by the Cast renderer. */
export function faceFeatures(
  head: [number, number, number],
  expr: Expression,
  opts: { blink?: boolean; look?: number } = {},
): Stroke[] {
  const f = faceStrokes(head, expr, opts);
  return [...f.brows, ...f.eyes, f.mouth];
}

// ---------- alive sequencing (pose/expression timing) ----------
const HOLD = 40;
const TRANS = 16;

/** Which pose is dominant at frame f (used to pick hand poses). */
export function currentPoseName(poses: StickPose[], f: number): StickPose {
  let t = f;
  let i = 0;
  while (i < poses.length - 1) {
    if (t < HOLD) return poses[i]!;
    t -= HOLD;
    if (t < TRANS) return t / TRANS < 0.5 ? poses[i]! : poses[i + 1]!;
    t -= TRANS;
    i++;
  }
  return poses[i]!;
}

/** Which expression is active at frame f (snaps at each step). */
export function currentExpression(exprs: Expression[], f: number): Expression {
  if (exprs.length === 0) return "neutral";
  const step = HOLD + TRANS;
  const i = Math.min(exprs.length - 1, Math.floor(f / step));
  return exprs[i]!;
}
