import { STICK_VIEWBOX, type Pt, type StickPose } from "./stick";
import { faceFeatures, type Expression } from "./character";
import { propShape, type PropKind } from "./props";
import type { Shape } from "./types";
import {
  BONES,
  CAST_POSES,
  fkArm,
  fkLeg,
  flipPose,
  getPose,
  SIDE_SIT_DESK,
  type ArmA,
  type CastPoseA,
  type CastView,
  type LegA,
} from "./castPose";

/**
 * "The Cast" — proprietary flat-filled vector people built on the joint rig
 * (skin, not skeleton). Each cast member is pure DATA (proportions, hair,
 * accent item) so member #6 is a data entry, not new code. Rendering turns a
 * posed skeleton into filled shapes: ink-filled body, paper-tone head so the
 * ink face reads, and flame on exactly one accent item.
 */

export type CastId = "alex" | "sage" | "max" | "maya" | "pip";
// "top"/"hand" are semantic tags for the fusion wardrobe layer — they render as
// ink in the normal cast (so the live cast is pixel-identical), but the fusion
// renderer recolors "top" → wardrobe color and "hand" → paper.
export type Fill = "ink" | "paper" | "flame" | "inkFar" | "top" | "sleeve" | "hand";
export type Part = { d: string; fill: Fill };
export type HairKind = "short" | "swoop" | "ponytail" | "sage" | "beanie";
export type AccentKind = "sneakers" | "bowtie" | "tie" | "hairband" | "beanie";
export type TorsoShape = "default" | "aline";
/** Where a seated figure sits. "chair" is the default; "none" opts out (the
 *  scene supplies the surface, e.g. a wall or ledge). */
export type SeatKind = "chair" | "desk" | "none";

export type CastDef = {
  id: CastId;
  name: string;
  heightScale: number; // overall figure scale
  build: number; // limb/torso width multiplier
  headScale: number; // head radius multiplier (big readable heads)
  hair: HairKind;
  beard?: boolean;
  glasses?: boolean;
  accent: AccentKind;
  torsoShape?: TorsoShape;
};

export const CAST: Record<CastId, CastDef> = {
  alex: { id: "alex", name: "Alex", heightScale: 1.0, build: 1.0, headScale: 1.0, hair: "short", accent: "sneakers" },
  sage: { id: "sage", name: "Sage", heightScale: 1.07, build: 0.82, headScale: 1.0, hair: "sage", beard: true, glasses: true, accent: "bowtie" },
  max: { id: "max", name: "Max", heightScale: 0.95, build: 1.55, headScale: 1.08, hair: "short", accent: "tie" },
  maya: { id: "maya", name: "Maya", heightScale: 1.0, build: 0.98, headScale: 1.0, hair: "ponytail", accent: "hairband", torsoShape: "aline" },
  pip: { id: "pip", name: "Pip", heightScale: 0.78, build: 1.22, headScale: 1.12, hair: "beanie", accent: "beanie" },
};

/** Which hand pose each arm uses per body pose (L/R before any flip). */
export const POSE_HANDS: Record<StickPose, { L: HandPose; R: HandPose }> = {
  standing: { L: "open", R: "open" },
  pointing: { L: "open", R: "point" },
  walking: { L: "fist", R: "fist" },
  sitting: { L: "open", R: "open" },
  thinking: { L: "open", R: "fist" },
  celebrating: { L: "open", R: "open" },
  panicking: { L: "open", R: "open" },
  shrugging: { L: "open", R: "open" },
  facepalm: { L: "open", R: "open" },
  handshake: { L: "open", R: "open" },
  presenting: { L: "open", R: "open" },
};

export const CAST_VIEWBOX = { w: STICK_VIEWBOX.w, h: STICK_VIEWBOX.h };

// ---------- shared proportion source (binds front & side views) ----------
/**
 * Side-view torso front-to-back depth as a fraction of the FRONT torso's full
 * width. A profile's thickness is derived from the same `build` that sets the
 * front width, so the two views can't drift: Max stays unmistakably the heavy
 * one and Sage the lean one, while every figure still reads as a profile.
 * Tuned in the 0.55–0.65 band.
 */
export const PROFILE_DEPTH = 0.62;

export type CastProps = {
  build: number;
  aline: boolean;
  headR: number; // shared head radius (the ¼-height rule) — identical both views
  // limb widths — IDENTICAL across views (a limb is the same limb side-on)
  aS: number; aE: number; aW: number; // arm: shoulder / elbow / wrist radii
  lH: number; lK: number; lA: number; // leg: hip / knee / ankle radii
  handScale: number; footScale: number;
  // front torso (half-widths)
  shoulderHalf: number; hipHalf: number;
  // side torso (front-to-back half-depths + heavy-build belly bulge)
  depthShoulder: number; depthHip: number; belly: number;
};

/**
 * THE single per-character proportion source. Both `castRender` (front) and
 * `castRenderSide` derive every width/thickness/depth from this, so the two
 * views are guaranteed to share one build system.
 */
export function castProps(def: CastDef): CastProps {
  const build = def.build;
  const aline = def.torsoShape === "aline";
  const shoulderHalf = 16 * build; // front: widest, at the shoulder line
  const hipHalf = shoulderHalf * (aline ? 1.35 : 0.72);
  const frontWidth = 2 * shoulderHalf; // full front torso width
  // side full depth = front width × PROFILE_DEPTH, split front:back ≈ 1 : 0.82.
  const fullDepth = frontWidth * PROFILE_DEPTH;
  const depthShoulder = fullDepth / 1.82;
  const depthHip = depthShoulder * (aline ? 1.5 : 1.0);
  // heavier builds carry the extra mass as a front belly bulge in profile;
  // light builds (Sage) get none. A short-stature term makes Pip a DIFFERENT
  // kind of big from Max — little-and-round (belly in a short frame) vs broad.
  const belly = Math.max(0, build - 0.92) * 18 + Math.max(0, 1 - def.heightScale) * 10;
  return {
    build,
    aline,
    headR: 22 * def.headScale,
    aS: 11 * build, aE: 8 * build, aW: 4.5 * build,
    lH: 13 * build, lK: 9 * build, lA: 6 * build,
    handScale: 1.05 * build, footScale: 1.2 * build,
    shoulderHalf, hipHalf,
    depthShoulder, depthHip, belly,
  };
}

// ---------- geometry helpers ----------
const n = (v: number) => Math.round(v * 100) / 100;
const P = (p: Pt) => `${n(p[0])} ${n(p[1])}`;

/** Tapered capsule (rounded trapezoid) from a (radius ra) to b (radius rb). */
export function capsule(a: Pt, b: Pt, ra: number, rb: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const a1: Pt = [a[0] + px * ra, a[1] + py * ra];
  const a2: Pt = [a[0] - px * ra, a[1] - py * ra];
  const b1: Pt = [b[0] + px * rb, b[1] + py * rb];
  const b2: Pt = [b[0] - px * rb, b[1] - py * rb];
  return `M ${P(a1)} L ${P(b1)} A ${n(rb)} ${n(rb)} 0 0 0 ${P(b2)} L ${P(a2)} A ${n(ra)} ${n(ra)} 0 0 0 ${P(a1)} Z`;
}

function circleD(cx: number, cy: number, r: number): string {
  return `M ${n(cx - r)} ${n(cy)} a ${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0 a ${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`;
}

function ellipseD(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${n(cx - rx)} ${n(cy)} a ${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0`;
}

/**
 * Clean torso: a rounded trapezoid — gentle shoulder corners at the top
 * (shoulderHalf), straight sides tapering to the hips (hipHalf), rounded
 * bottom. A-line = hipHalf > shoulderHalf (a straight flare, not a bulge).
 */
function torsoClean(
  cx: number,
  shoulderY: number,
  botY: number,
  shoulderHalf: number,
  hipHalf: number,
): string {
  const rT = Math.min(shoulderHalf * 0.5, 9);
  const rB = Math.min(hipHalf * 0.7, 13);
  return (
    `M ${n(cx - shoulderHalf)} ${n(shoulderY + rT)} ` +
    `Q ${n(cx - shoulderHalf)} ${n(shoulderY)} ${n(cx - shoulderHalf + rT)} ${n(shoulderY)} ` +
    `L ${n(cx + shoulderHalf - rT)} ${n(shoulderY)} ` +
    `Q ${n(cx + shoulderHalf)} ${n(shoulderY)} ${n(cx + shoulderHalf)} ${n(shoulderY + rT)} ` +
    `L ${n(cx + hipHalf)} ${n(botY - rB)} ` +
    `Q ${n(cx + hipHalf)} ${n(botY)} ${n(cx + hipHalf - rB)} ${n(botY)} ` +
    `L ${n(cx - hipHalf + rB)} ${n(botY)} ` +
    `Q ${n(cx - hipHalf)} ${n(botY)} ${n(cx - hipHalf)} ${n(botY - rB)} Z`
  );
}

// ---------- oriented shapes (hands, feet) ----------
type Cmd = (string | number)[];

/** Emit a path from canonical commands, rotated by `ang` and scaled by `s`,
 *  with the canonical origin placed at (ox, oy). */
function placed(cmds: Cmd[], ox: number, oy: number, ang: number, s: number): string {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const tp = (x: number, y: number): Pt => [ox + (x * ca - y * sa) * s, oy + (x * sa + y * ca) * s];
  let out = "";
  for (const c of cmds) {
    if (c[0] === "Z") {
      out += "Z ";
      continue;
    }
    const nums = c.slice(1) as number[];
    const parts: number[] = [];
    for (let i = 0; i < nums.length; i += 2) {
      const [X, Y] = tp(nums[i]!, nums[i + 1]!);
      parts.push(n(X), n(Y));
    }
    out += `${c[0]} ${parts.join(" ")} `;
  }
  return out.trim();
}

export type HandPose = "open" | "point" | "fist" | "holding" | "wave";

// Canonical mitt hands — wrist at origin, fingers toward +X, thumb on the -Y side.
const HAND_SHAPES: Record<"open" | "point" | "fist", Cmd[]> = {
  open: [
    ["M", -1, 6], ["L", 8, 6], ["Q", 14, 6, 14, 0], ["Q", 14, -6, 8, -6], ["L", 2, -6],
    ["Q", -1, -6, -2.5, -8.5], ["Q", -5.5, -9.5, -4.5, -5.5], ["Q", -4, -2, -1.5, -2],
    ["Q", -3.5, 0.5, -1, 6], ["Z"],
  ],
  point: [
    ["M", -1, 5.5], ["L", 6, 5.5], ["Q", 9, 5.5, 9, 2.5], ["L", 17.5, 1.4],
    ["Q", 19, 0.3, 17.5, -0.8], ["L", 9, -2.2], ["Q", 9, -5, 6, -5], ["L", 2, -5],
    ["Q", -1, -5, -2.5, -7.5], ["Q", -5.5, -8.5, -4.5, -5], ["Q", -4, -2, -1.5, -2],
    ["Q", -3.5, 0.5, -1, 5.5], ["Z"],
  ],
  fist: [
    ["M", -1, 6], ["L", 5, 6], ["Q", 10, 6, 10, 0], ["Q", 10, -6, 5, -6], ["L", 1, -6],
    ["Q", -2.5, -6, -3.5, -2.5], ["Q", -4.5, 1, -2, 3], ["Q", -3.5, 4.5, -1, 6], ["Z"],
  ],
};

export function handPart(pose: HandPose, wrist: Pt, elbow: Pt, s: number): string {
  const dx = wrist[0] - elbow[0];
  const dy = wrist[1] - elbow[1];
  const ang = Math.atan2(dy, dx);
  const len = Math.hypot(dx, dy) || 1;
  // small paper gap: push the hand just past the forearm's thin wrist cap
  const gap = 2.4;
  const ox = wrist[0] + (dx / len) * gap;
  const oy = wrist[1] + (dy / len) * gap;
  const shape = pose === "wave" ? "open" : pose === "holding" ? "fist" : pose;
  return placed(HAND_SHAPES[shape], ox, oy, ang, s);
}

// Canonical shoe — ankle at origin, toe toward +X, heel notch at -X.
const SHOE: Cmd[] = [
  ["M", -5, -1.5], ["Q", -7.5, -1.5, -7, 1.5], ["L", -5.5, 4.5], ["Q", -5, 6, -2, 6],
  ["L", 11, 6], ["Q", 15, 6, 15, 2.5], ["Q", 15, -0.5, 11, -1], ["L", -1, -1.5], ["Z"],
];

function mirrorX(c: Cmd): Cmd {
  const [cmd, ...nums] = c;
  if (cmd === "Z") return c;
  return [cmd as string, ...nums.map((v, i) => (i % 2 === 0 ? -(v as number) : (v as number)))];
}

function footPart(ankle: Pt, toeDir: number, s: number): string {
  // toeDir: +1 toe points right, -1 points left (mirror x, keep sole down)
  const cmds: Cmd[] = toeDir >= 0 ? SHOE : SHOE.map(mirrorX);
  return placed(cmds, ankle[0], ankle[1] + 2 * s, 0, s);
}

// ---------- hair / accent vocabulary ----------
function hairParts(kind: HairKind, cx: number, cy: number, r: number, fill: Fill): Part[] {
  switch (kind) {
    case "short":
      // a short cap that stops above the ears (not a draping hood)
      return [{ d: `M ${n(cx - r * 0.9)} ${n(cy - r * 0.52)} Q ${n(cx - r * 1.02)} ${n(cy - r * 1.14)} ${cx} ${n(cy - r * 1.18)} Q ${n(cx + r * 1.02)} ${n(cy - r * 1.14)} ${n(cx + r * 0.9)} ${n(cy - r * 0.52)} Q ${cx} ${n(cy - r * 0.84)} ${n(cx - r * 0.9)} ${n(cy - r * 0.52)} Z`, fill }];
    case "swoop":
      return [{ d: `M ${n(cx - r)} ${n(cy - r * 0.1)} Q ${n(cx - r * 1.1)} ${n(cy - r * 1.2)} ${n(cx + r * 0.3)} ${n(cy - r * 1.15)} Q ${n(cx + r * 1.2)} ${n(cy - r * 1.1)} ${n(cx + r * 0.95)} ${n(cy - r * 0.3)} Q ${n(cx + r * 0.2)} ${n(cy - r * 0.8)} ${n(cx - r)} ${n(cy - r * 0.1)} Z`, fill }];
    case "ponytail":
      return [
        { d: ellipseD(cx + r * 1.15, cy - r * 0.1, r * 0.42, r * 0.78), fill }, // ponytail blob
        { d: `M ${n(cx - r * 1.0)} ${n(cy - r * 0.1)} Q ${n(cx - r * 1.05)} ${n(cy - r * 1.25)} ${cx} ${n(cy - r * 1.22)} Q ${n(cx + r * 1.05)} ${n(cy - r * 1.2)} ${n(cx + r * 1.0)} ${n(cy - r * 0.1)} Q ${cx} ${n(cy - r * 0.68)} ${n(cx - r * 1.0)} ${n(cy - r * 0.1)} Z`, fill },
      ];
    case "sage":
      return [
        { d: `M ${n(cx - r * 1.02)} ${n(cy + r * 0.05)} Q ${n(cx - r * 1.05)} ${n(cy - r * 0.75)} ${n(cx - r * 0.55)} ${n(cy - r * 0.95)} Q ${n(cx - r * 0.75)} ${n(cy - r * 0.35)} ${n(cx - r * 0.95)} ${n(cy + r * 0.25)} Z`, fill }, // left side hair
        { d: `M ${n(cx + r * 1.02)} ${n(cy + r * 0.05)} Q ${n(cx + r * 1.05)} ${n(cy - r * 0.75)} ${n(cx + r * 0.55)} ${n(cy - r * 0.95)} Q ${n(cx + r * 0.75)} ${n(cy - r * 0.35)} ${n(cx + r * 0.95)} ${n(cy + r * 0.25)} Z`, fill }, // right side hair
      ];
    case "beanie":
      return [
        { d: `M ${n(cx - r * 1.04)} ${n(cy - r * 0.15)} Q ${cx} ${n(cy - r * 1.55)} ${n(cx + r * 1.04)} ${n(cy - r * 0.15)} Z`, fill }, // dome
        { d: `M ${n(cx - r * 1.04)} ${n(cy - r * 0.15)} L ${n(cx + r * 1.04)} ${n(cy - r * 0.15)} L ${n(cx + r * 1.04)} ${n(cy - r * 0.34)} L ${n(cx - r * 1.04)} ${n(cy - r * 0.34)} Z`, fill }, // brim band
      ];
  }
}

function beardPart(cx: number, cy: number, r: number): Part {
  // a trimmed chin beard that frames the jaw without covering the mouth
  return { d: `M ${n(cx - r * 0.56)} ${n(cy + r * 0.48)} Q ${n(cx - r * 0.5)} ${n(cy + r * 1.0)} ${cx} ${n(cy + r * 1.04)} Q ${n(cx + r * 0.5)} ${n(cy + r * 1.0)} ${n(cx + r * 0.56)} ${n(cy + r * 0.48)} Q ${cx} ${n(cy + r * 0.74)} ${n(cx - r * 0.56)} ${n(cy + r * 0.48)} Z`, fill: "ink" };
}

function accentShape(kind: AccentKind, cx: number, cy: number, r: number, neckY: number): Part[] {
  switch (kind) {
    case "bowtie":
      return [{ d: `M ${cx} ${n(neckY)} L ${n(cx - 9)} ${n(neckY - 5)} L ${n(cx - 9)} ${n(neckY + 5)} Z M ${cx} ${n(neckY)} L ${n(cx + 9)} ${n(neckY - 5)} L ${n(cx + 9)} ${n(neckY + 5)} Z`, fill: "flame" }];
    case "tie":
      return [{ d: `M ${n(cx - 4)} ${n(neckY)} L ${n(cx + 4)} ${n(neckY)} L ${n(cx + 7)} ${n(neckY + 30)} L ${cx} ${n(neckY + 40)} L ${n(cx - 7)} ${n(neckY + 30)} Z`, fill: "flame" }];
    case "hairband":
      return [{ d: `M ${n(cx - r * 1.02)} ${n(cy - r * 0.42)} Q ${cx} ${n(cy - r * 0.86)} ${n(cx + r * 1.02)} ${n(cy - r * 0.42)} L ${n(cx + r * 1.02)} ${n(cy - r * 0.6)} Q ${cx} ${n(cy - r * 1.04)} ${n(cx - r * 1.02)} ${n(cy - r * 0.6)} Z`, fill: "flame" }];
    default:
      return [];
  }
}

function glassesParts(cx: number, cy: number, r: number): Part[] {
  const dx = r * 0.42;
  const ey = cy - r * 0.06;
  const gr = r * 0.28;
  return [
    { d: circleD(cx - dx, ey, gr) + " " + circleD(cx - dx, ey, gr * 0.68), fill: "ink" },
    { d: circleD(cx + dx, ey, gr) + " " + circleD(cx + dx, ey, gr * 0.68), fill: "ink" },
    { d: `M ${n(cx - dx + gr)} ${n(ey)} L ${n(cx + dx - gr)} ${n(ey)} L ${n(cx + dx - gr)} ${n(ey + 1.2)} L ${n(cx - dx + gr)} ${n(ey + 1.2)} Z`, fill: "ink" },
  ];
}

// ---------- assembly ----------
export type CastRenderOpts = {
  expression?: Expression;
  flip?: boolean;
  blink?: boolean;
  look?: number;
  silhouette?: boolean; // pure ink fill, no face/accent color
  /** Minimum-width turn frames: body mass + hair block only (no face/accents),
   *  so the squash sliver never shows half-rendered features. */
  simplified?: boolean;
  seat?: SeatKind; // "desk" raises seated hands onto the desk line
  handL?: HandPose;
  handR?: HandPose;
};

export type CastRender = {
  fills: Part[]; // body + head in draw order (back → front)
  bodyFills: Part[]; // everything that stays with the torso
  headFills: Part[]; // head/hair/beard/glasses/head-accent — move with the head node
  face: string[]; // ink feature strokes, drawn last (move with the head node)
  head: [number, number, number];
  neck: [number, number]; // head-node pivot
  gripL: Grip; // hand anchor (armL) for held props
  gripR: Grip; // hand anchor (armR); in side view: L=near, R=far
};

export type Grip = { x: number; y: number; angle: number };
const grip = (a: [Pt, Pt, Pt]): Grip => ({
  x: a[2][0],
  y: a[2][1],
  angle: (Math.atan2(a[2][1] - a[1][1], a[2][0] - a[1][0]) * 180) / Math.PI,
});

// Fixed torso vertical layout (local units); poses may drop the whole torso.
const NECK_Y = 46;
const PELVIS_Y = 122;

export function castRender(def: CastDef, pose: CastPoseA, opts: CastRenderOpts = {}): CastRender {
  const p = opts.flip ? flipPose(pose) : pose;
  const cx = 50;
  const sil = opts.silhouette === true;
  const simple = opts.simplified === true; // minimum-width turn frame
  const inkOrFlame = (f: Fill): Fill => (sil ? "ink" : f);

  // ALL widths come from the shared proportion source (binds front ↔ side).
  const pr = castProps(def);
  const { aS, aE, aW, lH, lK, lA, handScale, footScale, shoulderHalf, hipHalf } = pr;

  // torso layout (clean rounded trapezoid: shoulders → hips)
  const aline = pr.aline;
  const drop = p.pelvisDrop ?? 0;
  const neckY = NECK_Y + drop;
  const torsoBot = PELVIS_Y + drop + 4;
  const shoulderY = neckY + (torsoBot - neckY) * 0.1;

  // anatomical sockets
  const socketL: Pt = [cx - shoulderHalf * 0.9, shoulderY];
  const socketR: Pt = [cx + shoulderHalf * 0.9, shoulderY];
  const hipL: Pt = [cx - hipHalf * 0.72, torsoBot - 3];
  const hipR: Pt = [cx + hipHalf * 0.72, torsoBot - 3];

  // a short visible neck lifts the head off the shoulders; neckPt is the pivot
  const headR = pr.headR;
  const neckLen = 7;
  const chinY = shoulderY - neckLen + 2; // head chin sits above the shoulder line
  const headCy = chinY - headR;
  const head: [number, number, number] = [cx, headCy, headR];
  const neckPt: [number, number] = [cx, shoulderY];

  // FORWARD KINEMATICS — derive joints from the angle pose
  const AL = fkArm(socketL, p.armL, BONES.upperArm, BONES.forearm);
  const AR = fkArm(socketR, p.armR, BONES.upperArm, BONES.forearm);
  const LL = fkLeg(hipL, p.legL, BONES.thigh, BONES.shin);
  const LR = fkLeg(hipR, p.legR, BONES.thigh, BONES.shin);

  const hL: HandPose = opts.flip ? opts.handR ?? "open" : opts.handL ?? "open";
  const hR: HandPose = opts.flip ? opts.handL ?? "open" : opts.handR ?? "open";
  const footFill: Fill = simple ? "ink" : inkOrFlame(def.accent === "sneakers" ? "flame" : "ink");

  const bodyFills: Part[] = [];
  // legs (behind) from the hip sockets
  bodyFills.push({ d: capsule(LL[0], LL[1], lH, lK), fill: "ink" });
  bodyFills.push({ d: capsule(LL[1], LL[2], lK, lA), fill: "ink" });
  bodyFills.push({ d: capsule(LR[0], LR[1], lH, lK), fill: "ink" });
  bodyFills.push({ d: capsule(LR[1], LR[2], lK, lA), fill: "ink" });
  bodyFills.push({ d: footPart(LL[2], LL[2][0] >= cx ? 1 : -1, footScale), fill: footFill });
  bodyFills.push({ d: footPart(LR[2], LR[2][0] >= cx ? 1 : -1, footScale), fill: footFill });
  // clean torso (wardrobe "top") + short neck
  bodyFills.push({ d: torsoClean(cx, shoulderY, torsoBot, shoulderHalf, hipHalf), fill: "top" });
  bodyFills.push({ d: capsule([cx, shoulderY + 2], [cx, chinY + 3], headR * 0.42, headR * 0.4), fill: "ink" });
  // arms = "sleeve" (ink by default; wardrobe only in full-top mode); mitt hands ink
  bodyFills.push({ d: capsule(AL[0], AL[1], aS, aE), fill: "sleeve" });
  bodyFills.push({ d: capsule(AL[1], AL[2], aE, aW), fill: "sleeve" });
  bodyFills.push({ d: capsule(AR[0], AR[1], aS, aE), fill: "sleeve" });
  bodyFills.push({ d: capsule(AR[1], AR[2], aE, aW), fill: "sleeve" });
  bodyFills.push({ d: handPart(hL, AL[2], AL[1], handScale), fill: "ink" });
  bodyFills.push({ d: handPart(hR, AR[2], AR[1], handScale), fill: "ink" });
  // accent on the body/neck (tie/bowtie) — stays with the torso (suppressed on
  // the minimum-width turn frame so no stray accent pixels show)
  if (!simple && (def.accent === "tie" || def.accent === "bowtie")) {
    bodyFills.push(...accentShape(def.accent, cx, headCy, headR, chinY).map((pp) => ({ ...pp, fill: inkOrFlame(pp.fill) })));
  }

  const headFills: Part[] = [];
  headFills.push({ d: circleD(cx, headCy, headR), fill: sil ? "ink" : "paper" });
  // hair block always draws (it IS the head mass); fine details are dropped on
  // the simplified turn frame.
  if (def.hair !== "beanie") headFills.push(...hairParts(def.hair, cx, headCy, headR, inkOrFlame("ink")));
  if (def.beard && !simple) headFills.push({ ...beardPart(cx, headCy, headR), fill: inkOrFlame("ink") });
  if (def.hair === "beanie") headFills.push(...hairParts("beanie", cx, headCy, headR, simple ? "ink" : inkOrFlame("flame")));
  if (!simple && def.accent === "hairband") {
    headFills.push(...accentShape("hairband", cx, headCy, headR, chinY).map((pp) => ({ ...pp, fill: inkOrFlame(pp.fill) })));
  }
  if (def.glasses && !sil && !simple) headFills.push(...glassesParts(cx, headCy, headR));

  const face = sil || simple ? [] : faceFeatures(head, opts.expression ?? "neutral", { blink: opts.blink, look: opts.look });

  return { fills: [...bodyFills, ...headFills], bodyFills, headFills, face, head, neck: neckPt, gripL: grip(AL), gripR: grip(AR) };
}

// ================= SIDE / PROFILE VIEW =================

/**
 * Profile torso. Depths come from `castProps`, so build drives it: `dS` = front
 * half-depth at the shoulders, `dH` = at the hips (A-line flares), `belly` =
 * extra front bulge carried by heavier builds. The result is a clearly
 * build-varied silhouette — deep and round for Max, slim for Sage.
 */
function torsoSide(
  cx: number,
  shoulderY: number,
  botY: number,
  dS: number,
  dH: number,
  belly: number,
  face: number,
): string {
  const topY = shoulderY + 4;
  const midY = shoulderY + (botY - shoulderY) * 0.52;
  const fS = cx + face * dS; // chest front at the shoulder
  const bS = cx - face * dS * 0.82; // upper back
  const fM = cx + face * (dS + belly); // belly bulge (front, mid-torso)
  const fH = cx + face * dH; // front at the hip (A-line flares out)
  const bB = cx - face * dS * 0.78; // lower back
  return (
    `M ${n(bS)} ${n(topY)} ` +
    `Q ${n(cx)} ${n(shoulderY - 4)} ${n(fS)} ${n(topY)} ` + // shoulder / chest top
    `Q ${n(fM)} ${n(midY)} ${n(fH)} ${n(botY - 6)} ` + // front: chest → belly → hip
    `Q ${n(fH)} ${n(botY)} ${n(fH - face * 7)} ${n(botY)} ` + // hip bottom (front)
    `L ${n(bB + face * 7)} ${n(botY)} ` +
    `Q ${n(bB)} ${n(botY)} ${n(bB)} ${n(botY - 7)} ` + // hip bottom (back)
    `Q ${n(cx - face * dS * 0.9)} ${n(midY)} ${n(bS)} ${n(topY)} Z` // back curve
  );
}

/** Profile head: circle + a nose bump on the facing side. */
function headSide(cx: number, cy: number, r: number, face: number): string {
  const nx = cx + face * r;
  return (
    circleD(cx, cy, r) +
    ` M ${n(nx * 1 - face * r * 0.08)} ${n(cy - r * 0.05)} ` +
    `L ${n(cx + face * r * 1.22)} ${n(cy + r * 0.14)} ` +
    `L ${n(cx + face * r * 0.85)} ${n(cy + r * 0.3)} Z`
  );
}

function hairSide(def: CastDef, cx: number, cy: number, r: number, face: number, inkOr: (f: Fill) => Fill): Part[] {
  const out: Part[] = [];
  if (def.hair === "beanie") {
    out.push({ d: `M ${n(cx - r * 1.05)} ${n(cy - r * 0.15)} Q ${n(cx)} ${n(cy - r * 1.55)} ${n(cx + r * 1.05)} ${n(cy - r * 0.15)} Z`, fill: inkOr("flame") });
    out.push({ d: `M ${n(cx - r * 1.05)} ${n(cy - r * 0.15)} L ${n(cx + r * 1.05)} ${n(cy - r * 0.15)} L ${n(cx + r * 1.05)} ${n(cy - r * 0.34)} L ${n(cx - r * 1.05)} ${n(cy - r * 0.34)} Z`, fill: inkOr("flame") });
    return out;
  }
  if (def.hair === "sage") {
    // bald top, a TRIMMED hair fringe hugging the back of the head (no halo)
    out.push({ d: `M ${n(cx - face * r * 0.98)} ${n(cy + r * 0.18)} Q ${n(cx - face * r * 0.98)} ${n(cy - r * 0.52)} ${n(cx - face * r * 0.48)} ${n(cy - r * 0.68)} Q ${n(cx - face * r * 0.58)} ${n(cy - r * 0.12)} ${n(cx - face * r * 0.9)} ${n(cy + r * 0.36)} Z`, fill: inkOr("ink") });
    return out;
  }
  if (def.hair === "ponytail") {
    // crown + ponytail pointing BACK (away from facing dir)
    out.push({ d: `M ${n(cx - face * r * 1.0)} ${n(cy - r * 0.2)} Q ${n(cx)} ${n(cy - r * 1.2)} ${n(cx + face * r * 0.95)} ${n(cy - r * 0.5)} Q ${n(cx)} ${n(cy - r * 0.86)} ${n(cx - face * r * 1.0)} ${n(cy - r * 0.2)} Z`, fill: inkOr("ink") });
    out.push({ d: ellipseD(cx - face * r * 1.2, cy - r * 0.05, r * 0.4, r * 0.72), fill: inkOr("ink") });
    // hairband: a clear, thick flame arc riding the hairline from the crown
    // down to the front edge (always reads in profile).
    if (def.accent === "hairband")
      out.push({
        d:
          `M ${n(cx - face * r * 0.55)} ${n(cy - r * 0.92)} ` +
          `Q ${n(cx + face * r * 0.5)} ${n(cy - r * 0.98)} ${n(cx + face * r * 1.08)} ${n(cy - r * 0.34)} ` +
          `L ${n(cx + face * r * 0.86)} ${n(cy - r * 0.22)} ` +
          `Q ${n(cx + face * r * 0.4)} ${n(cy - r * 0.74)} ${n(cx - face * r * 0.52)} ${n(cy - r * 0.68)} Z`,
        fill: inkOr("flame"),
      });
    return out;
  }
  // short cap (Alex, Max): over the top, slightly down the back
  out.push({ d: `M ${n(cx - face * r * 0.95)} ${n(cy - r * 0.35)} Q ${n(cx - face * r * 0.2)} ${n(cy - r * 1.2)} ${n(cx + face * r * 0.98)} ${n(cy - r * 0.5)} Q ${n(cx + face * r * 0.1)} ${n(cy - r * 0.78)} ${n(cx - face * r * 0.95)} ${n(cy - r * 0.35)} Z`, fill: inkOr("ink") });
  return out;
}

function beardSide(cx: number, cy: number, r: number, face: number): string {
  return `M ${n(cx + face * r * 0.5)} ${n(cy + r * 0.35)} Q ${n(cx + face * r * 1.0)} ${n(cy + r * 0.7)} ${n(cx + face * r * 0.75)} ${n(cy + r * 1.1)} Q ${n(cx + face * r * 0.2)} ${n(cy + r * 1.2)} ${n(cx - face * r * 0.1)} ${n(cy + r * 0.9)} Q ${n(cx + face * r * 0.2)} ${n(cy + r * 0.6)} ${n(cx + face * r * 0.5)} ${n(cy + r * 0.35)} Z`;
}

/** Max's tie in profile: a clear flame blade running down the chest's FRONT
 *  edge, from a collar knot to the belly. Rides the torso rotation in walk, so
 *  it sways with the body for free. */
function tieSide(cx: number, chinY: number, dS: number, belly: number, face: number): string {
  const topX = cx + face * (dS * 0.78);
  const topY = chinY + 2;
  const midX = cx + face * (dS + belly * 0.4);
  const midY = chinY + 20;
  const botX = cx + face * (dS + belly * 0.7);
  const botY = chinY + 40;
  const wT = 2.6;
  const wB = 5.5;
  return (
    `M ${n(topX - face * 5)} ${n(topY - 3)} L ${n(topX + face * 5)} ${n(topY - 3)} L ${n(topX)} ${n(topY + 5)} Z ` + // knot
    `M ${n(topX - face * wT)} ${n(topY + 2)} ` +
    `Q ${n(midX - face * wT)} ${n(midY)} ${n(botX - face * wB)} ${n(botY)} ` + // blade down the front edge
    `L ${n(botX + face * wB)} ${n(botY)} ` +
    `Q ${n(midX + face * wT)} ${n(midY)} ${n(topX + face * wT)} ${n(topY + 2)} Z`
  );
}

/** Sage's bowtie in profile: a flame knot bump at the throat with a forward
 *  wing (and a sliver of the back wing), so it never flattens to invisibility. */
function bowtieSide(cx: number, chinY: number, dS: number, face: number): string {
  // sit it at the collar, LOW enough to clear the beard that draws over it
  const kx = cx + face * (dS * 0.86);
  const ky = chinY + 7;
  return (
    `M ${n(kx)} ${n(ky)} L ${n(kx + face * 15)} ${n(ky - 8)} L ${n(kx + face * 15)} ${n(ky + 8)} Z ` + // forward wing (big)
    `M ${n(kx)} ${n(ky)} L ${n(kx - face * 5)} ${n(ky - 5)} L ${n(kx - face * 5)} ${n(ky + 5)} Z ` + // back wing sliver
    `M ${n(kx - face * 2.2)} ${n(ky - 4)} L ${n(kx + face * 2.2)} ${n(ky - 4)} L ${n(kx + face * 2.2)} ${n(ky + 4)} L ${n(kx - face * 2.2)} ${n(ky + 4)} Z` // knot
  );
}

function glassesSide(cx: number, cy: number, r: number, face: number): string {
  const ex = cx + face * r * 0.4;
  const ey = cy - r * 0.06;
  const gr = r * 0.3;
  return circleD(ex, ey, gr) + " " + circleD(ex, ey, gr * 0.66) + ` M ${n(ex + face * gr)} ${n(ey)} L ${n(cx + face * r * 1.05)} ${n(ey - r * 0.05)} L ${n(cx + face * r * 1.05)} ${n(ey + 1)} L ${n(ex + face * gr)} ${n(ey + 1)} Z`;
}

/**
 * Profile face: one eye + brow + a front-edge mouth, authored distinctly for
 * ALL 7 expressions (neutral and tired deliberately differ — tired has a
 * half-closed lid, a lowered/relaxed brow and a slack downturned mouth).
 */
type SideFaceSpec = {
  eye: "dot" | "wide" | "line";
  browDy: number; // inner-brow dy in units of r (negative = raised)
  browTiltFront: number; // front end dy in units of r (angry slants down to the front)
  mouth: "smile" | "frown" | "flat" | "slackdown" | "open" | "smallo" | "wavy";
};

const SIDE_FACES: Record<Expression, SideFaceSpec> = {
  neutral: { eye: "dot", browDy: 0, browTiltFront: 0, mouth: "flat" },
  happy: { eye: "dot", browDy: -0.06, browTiltFront: -0.02, mouth: "smile" },
  worried: { eye: "dot", browDy: -0.16, browTiltFront: 0.04, mouth: "wavy" },
  shocked: { eye: "wide", browDy: -0.22, browTiltFront: -0.14, mouth: "open" },
  angry: { eye: "dot", browDy: 0.12, browTiltFront: 0.16, mouth: "frown" },
  tired: { eye: "line", browDy: 0.05, browTiltFront: 0.04, mouth: "slackdown" },
  curious: { eye: "dot", browDy: -0.18, browTiltFront: -0.04, mouth: "smallo" },
};

function faceSideFeatures(head: [number, number, number], expr: Expression, face: number, blink: boolean): string[] {
  const [cx, cy, r] = head;
  const spec = SIDE_FACES[expr];
  const ex = cx + face * r * 0.4;
  const ey = cy - r * (expr === "tired" ? 0.03 : 0.06);
  const eyeR = spec.eye === "wide" ? r * 0.18 : r * 0.12;
  const out: string[] = [];
  // brow (back end → front end; front end can tilt for angry/shocked)
  const browY = cy - r * 0.42;
  out.push(`M ${n(ex - face * r * 0.16)} ${n(browY + spec.browDy * r)} L ${n(ex + face * r * 0.28)} ${n(browY + spec.browTiltFront * r)}`);
  // eye — line when blinking, tired, or spec says line
  if (blink || spec.eye === "line") out.push(`M ${n(ex - eyeR)} ${n(ey)} L ${n(ex + eyeR)} ${n(ey)}`);
  else out.push(circleD(ex, ey, eyeR));
  // mouth on the front edge
  const mx = cx + face * r * 0.52;
  const my = cy + r * 0.42;
  const mw = r * 0.26;
  switch (spec.mouth) {
    case "smile":
      out.push(`M ${n(mx - face * mw)} ${n(my - r * 0.04)} Q ${n(mx)} ${n(my + r * 0.34)} ${n(mx + face * mw)} ${n(my - r * 0.02)}`);
      break;
    case "frown":
      out.push(`M ${n(mx - face * mw)} ${n(my + r * 0.12)} Q ${n(mx)} ${n(my - r * 0.18)} ${n(mx + face * mw)} ${n(my + r * 0.12)}`);
      break;
    case "wavy":
      out.push(`M ${n(mx - face * mw)} ${n(my)} Q ${n(mx - face * mw * 0.2)} ${n(my - r * 0.16)} ${n(mx + face * mw * 0.3)} ${n(my + r * 0.02)} Q ${n(mx + face * mw * 0.7)} ${n(my + r * 0.16)} ${n(mx + face * mw)} ${n(my)}`);
      break;
    case "open":
      out.push(circleD(mx + face * r * 0.02, my + r * 0.02, r * 0.13));
      break;
    case "smallo":
      out.push(circleD(mx, my, r * 0.09));
      break;
    case "slackdown":
      // tired: a short slack mouth that droops toward the front
      out.push(`M ${n(mx - face * mw * 0.7)} ${n(my - r * 0.02)} Q ${n(mx)} ${n(my + r * 0.04)} ${n(mx + face * mw * 0.7)} ${n(my + r * 0.12)}`);
      break;
    default:
      out.push(`M ${n(mx - face * mw * 0.7)} ${n(my)} L ${n(mx + face * mw * 0.7)} ${n(my)}`);
  }
  return out;
}

export function castRenderSide(def: CastDef, pose: CastPoseA, opts: CastRenderOpts = {}): CastRender {
  const face = opts.flip ? -1 : 1; // +1 faces right
  const p = pose;
  const cx = 50;
  const sil = opts.silhouette === true;
  const simple = opts.simplified === true; // minimum-width turn frame
  const inkOr = (f: Fill): Fill => (sil ? "ink" : f);

  // Same shared proportion source as the front view. Limb widths are IDENTICAL
  // across views; the torso depth is derived from the front width.
  const pr = castProps(def);
  const { aS, aE, aW, lH, lK, lA, handScale, footScale } = pr;
  const dS = pr.depthShoulder;
  const belly = pr.belly;

  const aline = pr.aline;
  const drop = p.pelvisDrop ?? 0;
  const neckY = NECK_Y + drop;
  const torsoBot = PELVIS_Y + drop + 4;
  const shoulderY = neckY + (torsoBot - neckY) * 0.1;

  // sockets sit just off centre within the torso depth, scaling with build
  const nearX = cx + face * (dS * 0.24);
  const farX = cx - face * (dS * 0.24);
  const socketNear: Pt = [nearX, shoulderY];
  const socketFar: Pt = [farX, shoulderY];
  const hipNear: Pt = [nearX, torsoBot - 3];
  const hipFar: Pt = [farX, torsoBot - 3];

  const segF = (P: Pt, a: number, len: number): Pt => [
    P[0] + face * len * Math.sin((a * Math.PI) / 180),
    P[1] + len * Math.cos((a * Math.PI) / 180),
  ];
  const fkA = (sock: Pt, a: ArmA): [Pt, Pt, Pt] => {
    const e = segF(sock, a.sh, BONES.upperArm);
    return [sock, e, segF(e, a.fo, BONES.forearm)];
  };
  const fkL = (hip: Pt, a: LegA): [Pt, Pt, Pt] => {
    const k = segF(hip, a.hip, BONES.thigh);
    return [hip, k, segF(k, a.sh, BONES.shin)];
  };
  const ANear = fkA(socketNear, p.armL);
  const AFar = fkA(socketFar, p.armR);
  const LNear = fkL(hipNear, p.legL);
  const LFar = fkL(hipFar, p.legR);

  const headR = pr.headR; // shared with the front view (the ¼-height rule)
  const chinY = shoulderY - 7 + 2;
  const headCy = chinY - headR;
  const head: [number, number, number] = [cx, headCy, headR];
  const neckPt: [number, number] = [cx, shoulderY];

  const hNear: HandPose = opts.flip ? opts.handR ?? "open" : opts.handL ?? "open";
  const hFar: HandPose = opts.flip ? opts.handL ?? "open" : opts.handR ?? "open";
  const farFill: Fill = sil || simple ? "ink" : "inkFar";
  const footFillNear: Fill = simple ? "ink" : inkOr(def.accent === "sneakers" ? "flame" : "ink");
  const footFillFar: Fill = sil || simple ? "ink" : def.accent === "sneakers" ? "flame" : "inkFar";

  const bodyFills: Part[] = [];
  // far limbs (behind, lighter)
  bodyFills.push({ d: capsule(LFar[0], LFar[1], lH, lK), fill: farFill });
  bodyFills.push({ d: capsule(LFar[1], LFar[2], lK, lA), fill: farFill });
  bodyFills.push({ d: footPart(LFar[2], face, footScale), fill: footFillFar });
  bodyFills.push({ d: capsule(AFar[0], AFar[1], aS, aE), fill: farFill });
  bodyFills.push({ d: capsule(AFar[1], AFar[2], aE, aW), fill: farFill });
  bodyFills.push({ d: handPart(hFar, AFar[2], AFar[1], handScale), fill: farFill });
  // torso (wardrobe "top") + neck
  bodyFills.push({ d: torsoSide(cx, shoulderY, torsoBot, dS, pr.depthHip, belly, face), fill: "top" });
  bodyFills.push({ d: capsule([cx, shoulderY + 2], [cx, chinY + 3], headR * 0.4, headR * 0.38), fill: "ink" });
  // near limbs (front) — near arm is a sleeve ("top"), near hand "hand"
  bodyFills.push({ d: capsule(LNear[0], LNear[1], lH, lK), fill: "ink" });
  bodyFills.push({ d: capsule(LNear[1], LNear[2], lK, lA), fill: "ink" });
  bodyFills.push({ d: footPart(LNear[2], face, footScale), fill: footFillNear });
  bodyFills.push({ d: capsule(ANear[0], ANear[1], aS, aE), fill: "sleeve" });
  bodyFills.push({ d: capsule(ANear[1], ANear[2], aE, aW), fill: "sleeve" });
  bodyFills.push({ d: handPart(hNear, ANear[2], ANear[1], handScale), fill: "ink" });
  // front accents — deliberate profile versions, always visible (dropped only
  // on the minimum-width turn frame)
  if (!simple && def.accent === "tie") {
    bodyFills.push({ d: tieSide(cx, chinY, dS, belly, face), fill: inkOr("flame") });
  }
  if (!simple && def.accent === "bowtie") {
    bodyFills.push({ d: bowtieSide(cx, chinY, dS, face), fill: inkOr("flame") });
  }

  const headFills: Part[] = [];
  headFills.push({ d: headSide(cx, headCy, headR, face), fill: sil ? "ink" : "paper" });
  headFills.push(...hairSide(def, cx, headCy, headR, face, simple ? (() => "ink" as Fill) : inkOr));
  if (def.beard && !simple) headFills.push({ d: beardSide(cx, headCy, headR, face), fill: inkOr("ink") });
  if (def.glasses && !sil && !simple) headFills.push({ d: glassesSide(cx, headCy, headR, face), fill: "ink" });

  const faceStrokes = sil || simple ? [] : faceSideFeatures(head, opts.expression ?? "neutral", face, opts.blink === true);

  return { fills: [...bodyFills, ...headFills], bodyFills, headFills, face: faceStrokes, head, neck: neckPt, gripL: grip(ANear), gripR: grip(AFar) };
}

/** Dispatcher: render a cast figure in the pose's natural view (or forced). */
export function castFigureRender(
  def: CastDef,
  pose: StickPose,
  opts: CastRenderOpts & { view?: CastView } = {},
): CastRender {
  const view = opts.view ?? (pose === "walking" || pose === "sitting" ? "side" : "front");
  const ph = POSE_HANDS[pose];
  let poseA = getPose(pose, view);
  // seated at a desk: raise the hands onto the desk line (side view)
  if (pose === "sitting" && opts.seat === "desk" && view === "side") {
    poseA = { ...poseA, armL: SIDE_SIT_DESK.armL, armR: SIDE_SIT_DESK.armR };
  }
  const full = { handL: ph.L, handR: ph.R, ...opts };
  return view === "side" ? castRenderSide(def, poseA, full) : castRender(def, poseA, full);
}

export function castShapeForPose(def: CastDef, pose: StickPose, opts: CastRenderOpts = {}): CastRender {
  return castFigureRender(def, pose, opts);
}

// ---------- held props (hand-anchor API) ----------
/** Where the hand grips each prop, in the prop's own viewBox coords. */
const GRIP_OFFSET: Partial<Record<PropKind, [number, number]>> = {
  book: [70, 92],
  moneybag: [58, 48],
  lightbulb: [50, 112],
};

/** Place a prop gripped at a hand anchor: returns a transform + the prop shape. */
export function heldProp(kind: PropKind, g: Grip, s: number): { transform: string; shape: Shape } {
  const off = GRIP_OFFSET[kind] ?? [50, 50];
  const tilt = Math.max(-22, Math.min(22, (g.angle + 90) * 0.4));
  return {
    transform: `translate(${n(g.x)} ${n(g.y)}) rotate(${n(tilt)}) scale(${s}) translate(${-off[0]} ${-off[1]})`,
    shape: propShape(kind),
  };
}

/** A simple side-view chair (seat + back + legs), placed under a seated figure. */
export function chairSide(cx: number, seatY: number, s: number, face: number): string[] {
  const w = 34 * s; // seat depth
  const fx = cx + face * 4; // front of seat
  const bx = cx - face * (w - 4); // back of seat
  const seatTop = seatY;
  const legBot = seatY + 40 * s;
  const backTop = seatY - 42 * s;
  return [
    `M ${n(bx)} ${n(seatTop)} L ${n(fx)} ${n(seatTop)} L ${n(fx)} ${n(seatTop + 5)} L ${n(bx)} ${n(seatTop + 5)} Z`, // seat slab
    `M ${n(bx)} ${n(seatTop + 2)} L ${n(bx)} ${n(backTop)} L ${n(bx - face * 5)} ${n(backTop)} L ${n(bx - face * 5)} ${n(seatTop + 2)} Z`, // back
    `M ${n(fx - face * 3)} ${n(seatTop + 5)} L ${n(fx - face * 3)} ${n(legBot)} L ${n(fx - face * 7)} ${n(legBot)} L ${n(fx - face * 7)} ${n(seatTop + 5)} Z`, // front leg
    `M ${n(bx + face * 3)} ${n(seatTop + 5)} L ${n(bx + face * 3)} ${n(legBot)} L ${n(bx + face * 7)} ${n(legBot)} L ${n(bx + face * 7)} ${n(seatTop + 5)} Z`, // back leg
  ];
}

/**
 * Seat geometry placed under a seated figure, in SCENE coords, at the same ink
 * line style as the character. `behind` draws BEFORE the character (the chair,
 * so the figure sits onto it); `front` draws after (the desk panel). This is
 * the single placement rule shared by the sheets, the board draw-in plan, and
 * the alive renderer so a seated character is never left floating.
 */
export function seatStrokes(
  seat: SeatKind,
  cx: number,
  feetY: number,
  scale: number,
  face: number,
): { behind: string[]; front: string[] } {
  if (seat === "none") return { behind: [], front: [] };
  const seatY = feetY - 44 * scale;
  const chair = chairSide(cx, seatY, scale, face);
  // desk top sits at the seated-at-desk HAND height (hands land on it), not at
  // seat height — a desk is at elbow height, well above the lap.
  // desk legs reach the floor (feetY) so the desk stands, not floats.
  if (seat === "desk") return { behind: chair, front: deskSide(cx, feetY - 78 * scale, scale, face, feetY) };
  return { behind: chair, front: [] };
}

/**
 * Seat in the figure's own LOCAL (100×200) viewBox — so when the board scales
 * the figure into its scene box, the seat scales with it and stays aligned.
 * Used by the animated draw-in plan (chair behind, desk panel in front).
 */
export function seatLocal(seat: SeatKind, face: number): { behind: string[]; front: string[] } {
  if (seat === "none") return { behind: [], front: [] };
  const cx = 50;
  const seatY = 152; // just under the seated pelvis in local units
  const chair = chairSide(cx, seatY, 0.95, face);
  // desk top at the seated-at-desk hand height (local ≈ 118); legs reach the
  // local floor (~188) so the desk stands.
  if (seat === "desk") return { behind: chair, front: deskSide(cx, 118, 0.86, face, 188) };
  return { behind: chair, front: [] };
}

/** A simple side-view desk (top + front panel) in front of a seated figure.
 *  `botY` (optional) forces the leg to reach a given floor line. */
export function deskSide(cx: number, topY: number, s: number, face: number, botY?: number): string[] {
  const front = cx + face * 58 * s;
  const near = cx + face * 8 * s;
  const bot = botY ?? topY + 64 * s;
  return [
    `M ${n(near)} ${n(topY)} L ${n(front)} ${n(topY)} L ${n(front)} ${n(topY + 6)} L ${n(near)} ${n(topY + 6)} Z`, // top
    `M ${n(front - face * 4)} ${n(topY + 6)} L ${n(front - face * 4)} ${n(bot)} L ${n(front - face * 9)} ${n(bot)} L ${n(front - face * 9)} ${n(topY + 6)} Z`, // leg
  ];
}
