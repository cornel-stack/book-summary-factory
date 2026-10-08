import { Easing } from "remotion";
import { EASING_BEZIER, MOTION } from "../theme";
import type { Pt, StickPose } from "./stick";

/**
 * Forward-kinematics pose system for the cast. A pose is per-limb ANGLES +
 * bone lengths; joint positions are DERIVED (shoulder socket + upper-arm vector
 * → elbow → hand). This is the proper rig: arms genuinely rotate about the
 * shoulder, so transitions interpolate angles and get real arcs for free.
 *
 * Angle convention (local viewBox, y DOWN): degrees measured from straight
 * DOWN, rotating toward +X (right) as positive. 0 = down, +90 = right,
 * -90 = left, ±180 = up. Left-side limbs use negative (outward) angles,
 * right-side positive.
 */

export type ArmA = { sh: number; fo: number }; // upper-arm angle, forearm angle
export type LegA = { hip: number; sh: number }; // thigh angle, shin angle
export type CastPoseA = {
  armL: ArmA;
  armR: ArmA;
  legL: LegA;
  legR: LegA;
  torsoTilt?: number; // deg lean (+ = toward right)
  headTilt?: number; // deg
  pelvisDrop?: number; // lower the whole torso (sitting)
};

/** Bone lengths in local units (the whole figure is scaled by heightScale). */
export const BONES = { upperArm: 33, forearm: 29, thigh: 35, shin: 33 } as const;

const D2R = Math.PI / 180;
export const seg = (p: Pt, aDeg: number, len: number): Pt => [
  p[0] + len * Math.sin(aDeg * D2R),
  p[1] + len * Math.cos(aDeg * D2R),
];

export function fkArm(socket: Pt, a: ArmA, up: number, fore: number): [Pt, Pt, Pt] {
  const elbow = seg(socket, a.sh, up);
  const hand = seg(elbow, a.fo, fore);
  return [socket, elbow, hand];
}
export function fkLeg(hip: Pt, a: LegA, thigh: number, shin: number): [Pt, Pt, Pt] {
  const knee = seg(hip, a.hip, thigh);
  const foot = seg(knee, a.sh, shin);
  return [hip, knee, foot];
}

// ---------- the 11 poses, authored in angle space ----------
const HANG_L: ArmA = { sh: -15, fo: -3 }; // relaxed arm hanging from the shoulder
const HANG_R: ArmA = { sh: 15, fo: 3 };
const STANCE_L: LegA = { hip: -6, sh: -1 };
const STANCE_R: LegA = { hip: 6, sh: 1 };

export const CAST_POSES: Record<StickPose, CastPoseA> = {
  standing: { armL: HANG_L, armR: HANG_R, legL: STANCE_L, legR: STANCE_R },
  pointing: { armL: HANG_L, armR: { sh: 88, fo: 92 }, legL: STANCE_L, legR: STANCE_R },
  presenting: { armL: HANG_L, armR: { sh: 78, fo: 58 }, legL: STANCE_L, legR: STANCE_R },
  handshake: { armL: HANG_L, armR: { sh: 72, fo: 86 }, legL: STANCE_L, legR: STANCE_R },
  thinking: { armL: HANG_L, armR: { sh: 20, fo: -150 }, legL: STANCE_L, legR: STANCE_R, headTilt: -4 },
  facepalm: { armL: HANG_L, armR: { sh: 8, fo: -156 }, legL: STANCE_L, legR: STANCE_R, headTilt: 4 },
  shrugging: { armL: { sh: -54, fo: -118 }, armR: { sh: 54, fo: 118 }, legL: STANCE_L, legR: STANCE_R },
  celebrating: { armL: { sh: -150, fo: -166 }, armR: { sh: 150, fo: 166 }, legL: { hip: -11, sh: -2 }, legR: { hip: 11, sh: 2 } },
  panicking: { armL: { sh: -158, fo: -172 }, armR: { sh: 158, fo: 172 }, legL: { hip: -13, sh: -3 }, legR: { hip: 13, sh: 3 } },
  walking: { armL: { sh: 18, fo: 30 }, armR: { sh: -20, fo: -8 }, legL: { hip: -24, sh: 8 }, legR: { hip: 22, sh: -20 } },
  sitting: {
    // front-view seated: forearms drop down-outward so the hands rest on the
    // thighs/lap (no horizontal "zombie" arms reaching into air).
    armL: { sh: -24, fo: -14 },
    armR: { sh: 24, fo: 14 },
    legL: { hip: -66, sh: -8 },
    legR: { hip: 66, sh: 8 },
    pelvisDrop: 26,
  },
};

export type CastView = "front" | "side";

/**
 * Side-profile poses (sagittal plane): leg/arm angles now mean front↔back
 * swing (facing +X). "near" = legL/armL (facing side), "far" = legR/armR.
 * Walking and sitting live ONLY here; standing-side is used for the turn.
 */
export const SIDE_POSES: Partial<Record<StickPose, CastPoseA>> = {
  standing: {
    armL: { sh: 6, fo: 2 },
    armR: { sh: -6, fo: -2 },
    legL: { hip: 3, sh: 1 },
    legR: { hip: -3, sh: -1 },
  },
  walking: {
    armL: { sh: -24, fo: -16 }, // near arm back
    armR: { sh: 24, fo: 34 }, // far arm forward
    legL: { hip: 30, sh: 36 }, // near leg forward (heel strike)
    legR: { hip: -20, sh: 14 }, // far leg back, knee bent (toe-off)
  },
  sitting: {
    // seated in profile: elbows dropped, forearms angling DOWN so the hands
    // come to rest ON the thighs (hands-in-lap), never floating forward.
    armL: { sh: 14, fo: 10 }, // near arm
    armR: { sh: 12, fo: 8 }, // far arm
    legL: { hip: 84, sh: 6 }, // thighs forward (horizontal), shins down
    legR: { hip: 80, sh: 4 },
    pelvisDrop: 22,
    torsoTilt: -3,
  },
};

/**
 * Seated-at-a-desk arm override (side view): forearms reach FORWARD and down so
 * the hands land on the desk surface rather than the lap. Applied when a seated
 * figure's seat is "desk".
 */
export const SIDE_SIT_DESK: { armL: ArmA; armR: ArmA } = {
  armL: { sh: 36, fo: 60 },
  armR: { sh: 34, fo: 58 },
};

export function isSidePose(name: StickPose): boolean {
  return name === "walking" || name === "sitting";
}
export function poseView(name: StickPose): CastView {
  return isSidePose(name) ? "side" : "front";
}
export function getPose(name: StickPose, view: CastView): CastPoseA {
  const side = SIDE_POSES[name];
  return view === "side" && side ? side : CAST_POSES[name];
}

// ---------- flip / interpolation ----------
export function flipPose(p: CastPoseA): CastPoseA {
  const fa = (a: ArmA): ArmA => ({ sh: -a.sh, fo: -a.fo });
  const fl = (l: LegA): LegA => ({ hip: -l.hip, sh: -l.sh });
  return {
    armL: fa(p.armR),
    armR: fa(p.armL),
    legL: fl(p.legR),
    legR: fl(p.legL),
    torsoTilt: p.torsoTilt ? -p.torsoTilt : 0,
    headTilt: p.headTilt ? -p.headTilt : 0,
    pelvisDrop: p.pelvisDrop,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const la = (a: ArmA, b: ArmA, t: number): ArmA => ({ sh: lerp(a.sh, b.sh, t), fo: lerp(a.fo, b.fo, t) });
const ll = (a: LegA, b: LegA, t: number): LegA => ({ hip: lerp(a.hip, b.hip, t), sh: lerp(a.sh, b.sh, t) });

export function lerpPose(a: CastPoseA, b: CastPoseA, t: number): CastPoseA {
  return {
    armL: la(a.armL, b.armL, t),
    armR: la(a.armR, b.armR, t),
    legL: ll(a.legL, b.legL, t),
    legR: ll(a.legR, b.legR, t),
    torsoTilt: lerp(a.torsoTilt ?? 0, b.torsoTilt ?? 0, t),
    headTilt: lerp(a.headTilt ?? 0, b.headTilt ?? 0, t),
    pelvisDrop: lerp(a.pelvisDrop ?? 0, b.pelvisDrop ?? 0, t),
  };
}

const bez = (c: readonly number[]) => Easing.bezier(c[0]!, c[1]!, c[2]!, c[3]!);
const EASE = { anticipate: bez(EASING_BEZIER.anticipate) };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Pose angles at `frame`, with eased transitions (anticipation + overshoot via
 * back-ease) and head/free-arm follow-through — all in angle space, so the
 * hands sweep on true FK arcs.
 */
export type Segment = { from: StickPose; to: StickPose; t: number; holding: boolean };

/** Which pose segment (hold or transition) is active at `frame`. */
export function segmentAt(poses: StickPose[], frame: number): Segment {
  const { holdFrames: HOLD, transFrames: TRANS } = MOTION;
  let t = frame;
  let i = 0;
  while (i < poses.length - 1) {
    if (t < HOLD) return { from: poses[i]!, to: poses[i]!, t: 0, holding: true };
    t -= HOLD;
    if (t < TRANS) return { from: poses[i]!, to: poses[i + 1]!, t: t / TRANS, holding: false };
    t -= TRANS;
    i++;
  }
  return { from: poses[i]!, to: poses[i]!, t: 0, holding: true };
}

/** Eased interpolation between two poses WITHIN one view (anticipation +
 *  overshoot + head/free-arm follow-through), in angle space. */
export function easeSegment(from: StickPose, to: StickPose, raw: number, view: CastView): CastPoseA {
  const a = getPose(from, view);
  const b = getPose(to, view);
  if (raw <= 0) return a;
  if (raw >= 1) return b;
  const { followLagFrames: LAG, transFrames: TRANS } = MOTION;
  const tBody = EASE.anticipate(raw);
  const tLag = EASE.anticipate(clamp01((raw * TRANS - LAG) / TRANS));
  const body = lerpPose(a, b, tBody);
  const lag = lerpPose(a, b, tLag);
  const dL = Math.abs(b.armL.sh - a.armL.sh) + Math.abs(b.armL.fo - a.armL.fo);
  const dR = Math.abs(b.armR.sh - a.armR.sh) + Math.abs(b.armR.fo - a.armR.fo);
  if (dL >= dR) body.armR = lag.armR;
  else body.armL = lag.armL;
  body.headTilt = lag.headTilt;
  return body;
}

export type WalkAngles = { pose: CastPoseA; bob: number; leanDeg: number };

/**
 * Procedural weighted SIDE-view gait (facing +X): legs scissor front↔back from
 * the hips with a knee bend on the lifting (back) leg; arms swing low, front↔
 * back, opposing the legs; body bobs on each passing.
 */
export function walkAngles(frame: number): WalkAngles {
  const { walk } = MOTION;
  const ph = (frame / walk.cycleFrames) * Math.PI * 2;
  const s = Math.sin(ph);
  const swing = 30;
  const kneeNear = Math.max(0, -s) * 42; // near leg bends when it swings back
  const kneeFar = Math.max(0, s) * 42;
  return {
    pose: {
      legL: { hip: s * swing, sh: s * swing + kneeNear },
      legR: { hip: -s * swing, sh: -s * swing + kneeFar },
      armL: { sh: -s * 26, fo: -s * 26 - 8 }, // arms oppose legs, hanging low
      armR: { sh: s * 26, fo: s * 26 + 8 },
      torsoTilt: 4,
    },
    bob: -Math.abs(Math.sin(ph)) * walk.bobPx,
    leanDeg: 4,
  };
}
