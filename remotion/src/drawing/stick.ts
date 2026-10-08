import type { Stroke } from "./types";

/**
 * Shared primitives for the character system. The LinePeople joint rig that
 * once lived here has been retired (the proprietary Cast is the one character
 * system now — see drawing/cast.ts + drawing/castPose.ts). What remains is the
 * vocabulary the Cast still shares: the 2-D point type, the pose-name enum, the
 * local 100×200 viewBox, and the circle-path helper used by the face.
 */
export type Pt = [number, number];

export type StickPose =
  | "standing"
  | "sitting"
  | "pointing"
  | "thinking"
  | "celebrating"
  | "panicking"
  | "walking"
  | "shrugging"
  | "facepalm"
  | "handshake"
  | "presenting";

export const STICK_VIEWBOX = { w: 100, h: 200 } as const;

export function circlePath(cx: number, cy: number, r: number): Stroke {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
}
