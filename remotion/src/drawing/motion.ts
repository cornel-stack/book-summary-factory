import { MOTION } from "../theme";

/**
 * Seeded idle life for the cast — breathing plus occasional weight-shift /
 * head-turn micro-actions on a deterministic per-character schedule, so two
 * characters in a scene never move in lockstep. (Pose/walk motion lives in
 * castPose.ts.)
 */

/** Deterministic 0..1 hash from a string seed. */
export function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** A per-character/scene time offset so two characters never move in lockstep. */
export function staggerOffset(seed: string): number {
  return Math.round(seeded(seed) * MOTION.staggerFrames);
}

export type IdleState = { swayDeg: number; breathe: number; shiftX: number; headTurnDeg: number };

export function idleLife(frame: number, seed: string): IdleState {
  const { idle } = MOTION;
  const off = seeded(seed) * 1000;
  const f = frame + off;
  const swayDeg = Math.sin(f / 40) * idle.swayDeg;
  const breathe = Math.sin(f / 22) * idle.breathePx;

  const period = idle.microPeriod * (0.8 + seeded(seed + "p") * 0.5);
  const phase = (f % period) / period;
  const shiftX = bump(phase, 0.3, 0.12) * idle.weightShiftPx * (seeded(seed + "w") > 0.5 ? 1 : -1);
  const headTurnDeg = bump(phase, 0.7, 0.1) * idle.headTurnDeg * (seeded(seed + "h") > 0.5 ? 1 : -1);
  return { swayDeg, breathe, shiftX, headTurnDeg };
}

export type SeatedIdle = { breathe: number; foFidget: number; headTurnDeg: number };

/**
 * Seated idle: a settled figure doesn't sway its whole body — it breathes
 * shallowly and does an occasional small forearm/hand fidget (degrees added to
 * the forearm angle), on a seeded offbeat so two seated characters differ.
 */
export function idleSeated(frame: number, seed: string): SeatedIdle {
  const { idle } = MOTION;
  const off = seeded(seed) * 1000;
  const f = frame + off;
  const breathe = Math.sin(f / 26) * idle.breathePx * 0.6;
  const period = idle.microPeriod * (0.9 + seeded(seed + "sf") * 0.6);
  const phase = (f % period) / period;
  const foFidget = bump(phase, 0.5, 0.18) * 7 * (seeded(seed + "sd") > 0.5 ? 1 : -1);
  const headTurnDeg = bump(phase, 0.82, 0.1) * idle.headTurnDeg * 0.6 * (seeded(seed + "sh") > 0.5 ? 1 : -1);
  return { breathe, foFidget, headTurnDeg };
}

/** A smooth 0→1→0 bump centered at `c` with half-width `w` (in 0..1 phase). */
function bump(phase: number, c: number, w: number): number {
  const d = Math.abs(phase - c);
  if (d > w) return 0;
  return 0.5 * (1 + Math.cos((d / w) * Math.PI));
}
