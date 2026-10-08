import { getLength, getPointAtLength } from "@remotion/paths";
import { COLORS, DRAW } from "../theme";
import type { BoardElement, DrawPlan, Segment } from "./types";

/** Local→scene transform for an element (uniform scale, centered in its box). */
function transformFor(el: BoardElement) {
  const { viewBox } = el.shape;
  const scale = Math.min(el.box.w / viewBox.w, el.box.h / viewBox.h);
  const drawnW = viewBox.w * scale;
  const drawnH = viewBox.h * scale;
  return {
    scale,
    offsetX: el.box.x + (el.box.w - drawnW) / 2,
    offsetY: el.box.y + (el.box.h - drawnH) / 2,
  };
}

/**
 * Lay out every stroke of every element on the scene timeline. Elements draw
 * in listed order as one continuous performance; a synced element may push its
 * start later (to its spoken phrase), leaving the hand idle/off-screen in the
 * gap. Draw duration per stroke is derived from its on-screen length so speed
 * feels consistent.
 */
export function buildPlan(elements: BoardElement[], fps: number): DrawPlan {
  const pxPerFrame = DRAW.speedPxPerSec / fps;
  const segments: Segment[] = [];
  const drawEndByKey: Record<string, number> = {};
  let cursor = 0;

  // Draw in temporal order: earliest synced start first, stable for ties
  // (unsynced startFrame=0 keep their listed order and chain back-to-back).
  const ordered = elements
    .map((el, i) => ({ el, i }))
    .sort((a, b) => a.el.startFrame - b.el.startFrame || a.i - b.i)
    .map((x) => x.el);

  for (const el of ordered) {
    const { scale, offsetX, offsetY } = transformFor(el);
    const color = el.strokeColor ?? COLORS.ink;
    const width = el.strokeWidth ?? 5;

    // Per-stroke natural durations, then cap the element's WHOLE draw (strokes
    // + the lift hops between them) at ~2.5s by squeezing both.
    const nStrokes = el.shape.strokes.length;
    const rawFrames = el.shape.strokes.map((d) =>
      Math.max(DRAW.minStrokeFrames, Math.round((getLength(d) * scale) / pxPerFrame)),
    );
    const natural =
      rawFrames.reduce((a, b) => a + b, 0) + Math.max(0, nStrokes - 1) * DRAW.liftFrames;
    const squeeze = natural > DRAW.maxElementFrames ? DRAW.maxElementFrames / natural : 1;
    const strokeFrames = rawFrames.map((fr) => Math.max(2, Math.round(fr * squeeze)));
    const liftF = Math.max(1, Math.round(DRAW.liftFrames * squeeze));

    let f = Math.max(cursor, el.startFrame);
    el.shape.strokes.forEach((d, si) => {
      const frames = strokeFrames[si]!;
      segments.push({
        elementKey: el.key,
        d,
        offsetX,
        offsetY,
        scale,
        startFrame: f,
        endFrame: f + frames,
        strokeColor: color,
        strokeWidth: width,
      });
      f += frames + liftF;
    });
    const drawEnd = f - liftF;
    drawEndByKey[el.key] = drawEnd;
    cursor = drawEnd + DRAW.gapFrames;
  }

  const lastFrame = segments.reduce((m, s) => Math.max(m, s.endFrame), 0);
  return { segments, drawEndByKey, lastFrame };
}

const scenePoint = (s: Segment, len: number) => {
  const p = getPointAtLength(s.d, len);
  if (!p) return { x: s.offsetX, y: s.offsetY };
  return { x: s.offsetX + p.x * s.scale, y: s.offsetY + p.y * s.scale };
};

export type HandState = {
  visible: boolean;
  x: number;
  y: number;
  angle: number; // tilt degrees (a few degrees into stroke direction)
  lift: number; // 1 = on paper, >1 = lifted/hopping
  grip: number; // stroke index — alternate the grip image per stroke
};

/**
 * Where the drawing hand is at `frame`: on the active pen tip while drawing,
 * hopping (lifted) between strokes, flying in before the first stroke and out
 * after the last, hidden otherwise.
 */
export function computeHand(
  frame: number,
  segments: Segment[],
  sceneW: number,
  sceneH: number,
  fps: number,
): HandState {
  const hidden: HandState = { visible: false, x: 0, y: 0, angle: 0, lift: 1, grip: 0 };
  if (segments.length === 0) return hidden;

  const off = { x: sceneW * 0.82, y: sceneH + 240 };
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;

  // Active stroke → follow the pen tip.
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]!;
    if (frame >= s.startFrame && frame < s.endFrame) {
      const localLen = getLength(s.d);
      const prog = (frame - s.startFrame) / (s.endFrame - s.startFrame);
      const dist = prog * localLen;
      const p = scenePoint(s, dist);
      const ahead = scenePoint(s, Math.min(dist + 1.5, localLen));
      const dirDeg = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
      const angle = Math.max(-10, Math.min(10, dirDeg * 0.12));
      return { visible: true, x: p.x, y: p.y, angle, lift: 1, grip: i };
    }
  }

  // Before everything: fly in.
  if (frame < first.startFrame) {
    const enterStart = first.startFrame - DRAW.enterFrames;
    if (frame < enterStart) return hidden;
    const t = (frame - enterStart) / DRAW.enterFrames;
    const target = scenePoint(first, 0);
    return {
      visible: true,
      x: off.x + (target.x - off.x) * t,
      y: off.y + (target.y - off.y) * t,
      angle: 0,
      lift: 1.08,
      grip: 0,
    };
  }

  // After everything: fly out.
  if (frame >= last.endFrame) {
    const t = (frame - last.endFrame) / DRAW.exitFrames;
    if (t >= 1) return hidden;
    const fromPt = scenePoint(last, getLength(last.d));
    return {
      visible: true,
      x: fromPt.x + (off.x - fromPt.x) * t,
      y: fromPt.y + (off.y - fromPt.y) * t,
      angle: 0,
      lift: 1 + 0.12 * t,
      grip: segments.length - 1,
    };
  }

  // Between two strokes: travel to the next start. A short gap → a fast arc hop
  // (≥4× draw speed, capped at 0.25s) then hover at the target; a LONG idle wait
  // (e.g. a sync'd element far ahead) → fly OUT after the previous stroke and
  // fly back IN just before the next, instead of slowly drifting across.
  let prev: Segment | null = null;
  let prevIdx = -1;
  let nextIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i]!.endFrame <= frame) {
      prev = segments[i]!;
      prevIdx = i;
    }
    if (segments[i]!.startFrame > frame && nextIdx === -1) nextIdx = i;
  }
  const next = nextIdx >= 0 ? segments[nextIdx]! : null;
  if (prev && next) {
    const a = scenePoint(prev, getLength(prev.d));
    const b = scenePoint(next, 0);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const span = next.startFrame - prev.endFrame;
    const travelPerFrame = (DRAW.speedPxPerSec * DRAW.travelMult) / fps;
    const hopCap = Math.max(2, Math.round(DRAW.hopCapSec * fps));
    const hopFrames = Math.max(2, Math.min(hopCap, Math.ceil(d / travelPerFrame)));
    const longHop = d > DRAW.longHopFrac * sceneW;
    const longWait = span > DRAW.enterFrames + DRAW.exitFrames + 4;

    if (longWait) {
      // fly out, wait off-page, fly back in — no slow drift across the frame
      const sinceEnd = frame - prev.endFrame;
      const untilNext = next.startFrame - frame;
      if (sinceEnd < DRAW.exitFrames) {
        const t = sinceEnd / DRAW.exitFrames;
        return { visible: true, x: a.x + (off.x - a.x) * t, y: a.y + (off.y - a.y) * t, angle: 0, lift: 1 + 0.14 * t, grip: prevIdx };
      }
      if (untilNext <= DRAW.enterFrames) {
        const t = 1 - untilNext / DRAW.enterFrames;
        return { visible: true, x: off.x + (b.x - off.x) * t, y: off.y + (b.y - off.y) * t, angle: 0, lift: 1.14 - 0.06 * t, grip: nextIdx };
      }
      return hidden;
    }

    // short gap: snap across fast, then hover (crisp arrival, no pre-stroke settle)
    const t = Math.min(1, (frame - prev.endFrame) / hopFrames);
    const arc = longHop ? 72 : 26; // a wide hop lifts out / drops in with a high arc
    return {
      visible: true,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * arc,
      angle: 0,
      lift: longHop ? 1.14 : 1.08,
      grip: t < 0.5 ? prevIdx : nextIdx,
    };
  }
  return hidden;
}
