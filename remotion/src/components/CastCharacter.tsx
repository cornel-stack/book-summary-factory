import React from "react";
import { COLORS } from "../theme";
import {
  CAST,
  castFigureRender,
  castRender,
  castRenderSide,
  heldProp,
  POSE_HANDS,
  seatLocal,
  type CastId,
  type Fill,
  type SeatKind,
} from "../drawing/cast";
import { type PropKind } from "../drawing/props";
import { type StickPose } from "../drawing/stick";
import { currentExpression, currentPoseName, type Expression } from "../drawing/character";
import {
  easeSegment,
  getPose,
  poseView,
  segmentAt,
  SIDE_SIT_DESK,
  walkAngles,
  type CastView,
} from "../drawing/castPose";
import { idleLife, idleSeated } from "../drawing/motion";
import type { BoardElement } from "../drawing/types";
import { castFillColor, type WardrobeMode } from "./CastFigure";
import { useBrand } from "../brand";

const FILL_FRAMES = 12; // ~0.4s directional fill wipe
const WIPE_SOFT = 14; // soft edge width (local units)

export type HeadAction = { kind: "nod" | "headshake" | "shake"; actionFrame: number };
export type ExprStep = { value: Expression; atFrame: number };
export type Holding = { prop: PropKind; hand: "left" | "right" };

const drawPaths = (parts: { d: string; fill: Fill }[], sw: number, cc: (f: Fill) => string) =>
  parts.map((p, i) => (
    <path key={i} d={p.d} fill={cc(p.fill)} fillRule="evenodd" stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
  ));

/** Outline paths the hand traces (fills' contours + face), in draw order. When
 *  the figure is seated, the seat is prepended (chair drawn FIRST, character
 *  onto it) and the desk panel appended — a single-pen draw-in plan. */
export function castOutlineStrokes(
  castId: CastId,
  pose: StickPose,
  opts: { flip?: boolean; expression?: Expression; seat?: SeatKind; view?: CastView } = {},
): string[] {
  const r = castFigureRender(CAST[castId], pose, { flip: opts.flip, expression: opts.expression, seat: opts.seat, view: opts.view });
  const seat =
    pose === "sitting" && opts.seat && opts.seat !== "none"
      ? seatLocal(opts.seat, opts.flip ? -1 : 1)
      : { behind: [], front: [] };
  return [...seat.behind, ...r.fills.map((p) => p.d), ...r.face, ...seat.front];
}

/** The fills wiping in (left→right soft wipe) during the last ~0.4s of draw. */
export const CastFillWipe: React.FC<{
  castId: CastId;
  pose: StickPose;
  expression: Expression;
  flip?: boolean;
  seat?: SeatKind;
  view?: CastView;
  wardrobe?: WardrobeMode;
  scale: number;
  progress: number; // 0 → 1
}> = ({ castId, pose, expression, flip, seat, view, wardrobe = "torso", scale, progress }) => {
  const r = castFigureRender(CAST[castId], pose, { expression, flip, seat, view });
  const sw = 2 / scale;
  const brand = useBrand();
  const cc = castFillColor(castId, wardrobe, { accent: brand.accentOnInk, paper: brand.paper });
  const sStrokes =
    pose === "sitting" && seat && seat !== "none" ? seatLocal(seat, flip ? -1 : 1) : { behind: [], front: [] };
  const gid = `wipe-${castId}-${pose}-${flip ? "f" : "n"}`;
  const wipeX = -WIPE_SOFT + progress * (100 + 2 * WIPE_SOFT);
  const o1 = Math.max(0, Math.min(1, (wipeX - WIPE_SOFT) / 100));
  const o2 = Math.max(0, Math.min(1, (wipeX + WIPE_SOFT) / 100));
  return (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset={o1} stopColor="white" />
          <stop offset={o2} stopColor="black" />
        </linearGradient>
        <mask id={`${gid}-m`}>
          <rect x="-30" y="-30" width="160" height="260" fill={`url(#${gid})`} />
        </mask>
      </defs>
      <g mask={`url(#${gid}-m)`}>
        {sStrokes.behind.map((d, i) => (
          <path key={`sb${i}`} d={d} fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
        ))}
        {drawPaths(r.fills, sw, cc)}
        {sStrokes.front.map((d, i) => (
          <path key={`sf${i}`} d={d} fill={brand.paper} stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
        ))}
      </g>
    </>
  );
};

/** A finished cast character, alive: pose/expression animation, blink, walk
 * cycle, and a separable head node (idle sway + nod/headshake/shake). */
export const AliveCast: React.FC<{
  castId: CastId;
  poses: StickPose[];
  expression: Expression;
  flip?: boolean;
  frame: number; // frames since drawing finished
  scale: number;
  action?: HeadAction;
  seed?: string;
  holding?: Holding;
  seat?: SeatKind;
  view?: CastView;
  wardrobe?: WardrobeMode;
  entrance?: "draw" | "walk";
  enterSlide?: number; // local-unit off-edge start for a walk-in
}> = ({ castId, poses, expression, flip, frame, scale, action, seed = castId, holding, seat = "chair", view: forcedView, wardrobe = "torso", entrance, enterSlide }) => {
  const def = CAST[castId];
  const seg = segmentAt(poses, frame);
  // forced view overrides the auto (walk/sit → side) for both ends of a segment.
  const fromView = forcedView ?? poseView(seg.from);
  const toView = forcedView ?? poseView(seg.to);

  // Resolve the pose + view for this frame, handling cross-view "turn".
  let view = toView;
  let poseA = getPose(seg.to, view);
  let squashX = 1;
  let slideX = 0;
  let walkBob = 0;
  let leanDeg = 0;
  let crouch = 0;
  let simplified = false;

  const walking = seg.from === "walking" && seg.holding;
  if (walking) {
    // weighted procedural side-gait entrance
    view = "side";
    const w = walkAngles(frame);
    poseA = w.pose;
    // walk-in slide must COMPLETE inside the walking hold (MOTION.holdFrames=40)
    // or the figure teleports when the turn begins. Ease to 0 by frame ~38.
    const isEntry = entrance === "walk";
    const win = isEntry ? 38 : 44;
    const raw = frame < win ? Math.max(0, 1 - frame / win) : isEntry ? 0 : 0.6;
    const settle = raw * raw * (3 - 2 * raw); // smoothstep ease-out into place
    const slideAmt = isEntry ? enterSlide ?? -36 : -36;
    walkBob = w.bob;
    leanDeg = w.leanDeg;
    slideX = settle > 0.02 ? settle * slideAmt : 0;
    crouch = !isEntry && frame < 8 ? Math.sin((frame / 8) * Math.PI) * 3 : 0;
  } else if (seg.holding || fromView === toView) {
    view = toView;
    poseA = seg.holding ? getPose(seg.to, view) : easeSegment(seg.from, seg.to, seg.t, view);
  } else {
    // TURN: squash the "from" view out, grow the "to" view in.
    if (seg.t < 0.5) {
      view = fromView;
      poseA = getPose(seg.from, fromView);
      squashX = Math.max(0.08, 1 - seg.t * 2 * 0.92);
    } else {
      view = toView;
      poseA = getPose(seg.to, toView);
      squashX = Math.max(0.08, 0.08 + (seg.t - 0.5) * 2 * 0.92);
    }
    // below ~25% width, render the simplified body-mass-only state (no face /
    // accents) so the turn's narrowest frames stay clean.
    simplified = squashX < 0.25;
  }

  // Seated-at-a-desk: raise the hands onto the desk line.
  const seated = seg.holding && seg.to === "sitting" && view === "side";
  if (seated && seat === "desk") {
    poseA = { ...poseA, armL: SIDE_SIT_DESK.armL, armR: SIDE_SIT_DESK.armR };
  }

  // Idle: seated figures do a tiny forearm/hand fidget instead of a full-body
  // sway; standing figures breathe + weight-shift as before.
  let idle = { swayDeg: 0, breathe: 0, shiftX: 0, headTurnDeg: 0 };
  if (!walking) {
    if (seated) {
      const si = idleSeated(frame, seed);
      idle = { swayDeg: 0, breathe: si.breathe, shiftX: 0, headTurnDeg: si.headTurnDeg };
      poseA = {
        ...poseA,
        armL: { ...poseA.armL, fo: poseA.armL.fo + si.foFidget },
        armR: { ...poseA.armR, fo: poseA.armR.fo + si.foFidget * 0.6 },
      };
    } else {
      idle = idleLife(frame, seed);
    }
  }

  const blink = frame % 120 < 5;
  const ph = POSE_HANDS[currentPoseName(poses, frame)];
  const r = view === "side"
    ? castRenderSide(def, poseA, { expression, flip, blink, simplified, handL: ph.L, handR: ph.R })
    : castRender(def, poseA, { expression, flip, blink, simplified, handL: ph.L, handR: ph.R });
  const sw = 2 / scale;
  const brand = useBrand();
  const cc = castFillColor(castId, wardrobe, { accent: brand.accentOnInk, paper: brand.paper });
  const [nx, ny] = r.neck;

  // Head node = idle sway/turn + follow-through + action.
  let hy = idle.breathe * 0.5;
  let hrot = idle.swayDeg + idle.headTurnDeg;
  let bodyShake = 0;
  if (action) {
    const t = action.actionFrame;
    if (t >= 0) {
      if (action.kind === "nod") hy += Math.sin(t * 0.5) * 3.4;
      else if (action.kind === "headshake") hrot += Math.sin(t * 0.6) * 10;
      else if (action.kind === "shake") bodyShake = Math.sin(t * 2.3) * 2.2;
    }
  }

  const bodyY = walkBob + crouch + idle.breathe;
  const squash = squashX !== 1 ? ` translate(50 0) scale(${squashX} 1) translate(-50 0)` : "";
  const held = holding
    ? heldProp(holding.prop, holding.hand === "left" ? r.gripL : r.gripR, 0.32 * def.build)
    : null;
  // Seat under a seated figure (local coords, outside the body's motion so the
  // chair doesn't sway with the character). Hidden during the turn squash.
  const showSeat = seated && seat !== "none";
  const seatG = showSeat ? seatLocal(seat, flip ? -1 : 1) : { behind: [], front: [] };
  return (
    <>
      {seatG.behind.map((d, i) => (
        <path key={`sb${i}`} d={d} fill={COLORS.ink} stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      <g transform={`translate(${slideX + bodyShake + idle.shiftX} ${bodyY}) rotate(${leanDeg + idle.swayDeg * 0.5} 50 188)${squash}`}>
        {drawPaths(r.bodyFills, sw, cc)}
        {held && (
          <g transform={held.transform}>
            {held.shape.strokes.map((d, i) => (
              <path key={`hp${i}`} d={d} fill={brand.paper} stroke={COLORS.ink} strokeWidth={sw * 1.3} strokeLinejoin="round" />
            ))}
          </g>
        )}
        <g transform={`rotate(${hrot} ${nx} ${ny}) translate(0 ${hy})`}>
          {drawPaths(r.headFills, sw, cc)}
          {r.face.map((d, i) => (
            <path key={`f${i}`} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw * 1.4} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
      </g>
      {seatG.front.map((d, i) => (
        <path key={`sf${i}`} d={d} fill={brand.paper} stroke={COLORS.ink} strokeWidth={sw} strokeLinejoin="round" />
      ))}
    </>
  );
};

/** Build a board element for a cast character (outline draw → fill wipe → alive). */
export function castBoardElement(args: {
  key: string;
  castId: CastId;
  box: { x: number; y: number; w: number; h: number };
  startFrame: number;
  sceneFrame: number; // current scene frame (captured each render)
  poses: StickPose[];
  expressions?: Expression[]; // fixed-timer fallback
  expressionSteps?: ExprStep[]; // sync-driven (takes precedence)
  flip?: boolean;
  action?: { kind: "nod" | "headshake" | "shake"; startFrame: number };
  label?: string;
  seed?: string;
  holding?: Holding;
  seat?: SeatKind;
  view?: CastView;
  wardrobe?: WardrobeMode;
  entrance?: "draw" | "walk";
  enterSlide?: number;
}): BoardElement {
  const { castId, poses, expressions, expressionSteps, flip, sceneFrame, view, entrance, enterSlide } = args;
  const seed = args.seed ?? args.key;
  const seat = args.seat ?? "chair";
  const wardrobe = args.wardrobe ?? "torso";
  const pose0 = poses[0]!;
  const expr0 = expressionSteps?.[0]?.value ?? expressions?.[0] ?? "neutral";

  return {
    key: args.key,
    // walk-in figures stride in already alive → nothing to draw.
    shape: {
      viewBox: { w: 100, h: 200 },
      strokes: entrance === "walk" ? [] : castOutlineStrokes(castId, pose0, { flip, expression: expr0, seat, view }),
    },
    box: args.box,
    startFrame: args.startFrame,
    strokeColor: COLORS.ink,
    strokeWidth: 2.5,
    label: args.label,
    labelAnchor: "bottom",
    fillOverlay: ({ frame, drawEnd, scale }) => {
      const progress = (frame - (drawEnd - FILL_FRAMES)) / FILL_FRAMES;
      if (progress <= 0) return null;
      return (
        <CastFillWipe
          castId={castId}
          pose={pose0}
          expression={expr0}
          flip={flip}
          seat={seat}
          view={view}
          wardrobe={wardrobe}
          scale={scale}
          progress={Math.min(1, progress)}
        />
      );
    },
    alive: (frameSinceDone, scale) => {
      // Resolve current expression (sync steps take precedence, else timer).
      let expr: Expression = expr0;
      if (expressionSteps && expressionSteps.length) {
        for (const s of expressionSteps) if (sceneFrame >= s.atFrame) expr = s.value;
      } else if (expressions && expressions.length > 1) {
        expr = currentExpression(expressions, frameSinceDone);
      }
      const action = args.action
        ? { kind: args.action.kind, actionFrame: sceneFrame - args.action.startFrame }
        : undefined;
      return (
        <AliveCast
          castId={castId}
          poses={poses}
          expression={expr}
          flip={flip}
          frame={frameSinceDone}
          scale={scale}
          action={action}
          seed={seed}
          holding={args.holding}
          seat={seat}
          view={view}
          wardrobe={wardrobe}
          entrance={entrance}
          enterSlide={enterSlide}
        />
      );
    },
  };
}
