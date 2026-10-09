import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, LAYOUT, VIDEO } from "../theme";
import { useBrand } from "../brand";
import { DrawingBoard } from "../components/DrawingBoard";
import { Stage } from "../components/Stage";
import { Crowd, type CrowdArrangement } from "../components/Crowd";
import { RevealLayer, type Reveal, type RevealItem } from "../components/RevealLayer";
import { castBoardElement, castOutlineStrokes, type ExprStep } from "../components/CastCharacter";
import { Effect, CHARACTER_ACTION_EFFECTS, type EffectKind } from "../components/Effects";
import type { Expression } from "../drawing/character";
import { type StickPose } from "../drawing/stick";
import { type CastView } from "../drawing/castPose";
import { type StageName } from "../drawing/stage";
import { propShape, type PropKind } from "../drawing/props";
import { type CastId } from "../drawing/cast";
import { gridBox, syncStartFrame } from "../drawing/layout";
import { buildPlan } from "../drawing/plan";
import type { BoardElement } from "../drawing/types";
import type { WordTiming, CharacterElement } from "../schema";

const STROKE = 6;

const shrink = (b: { x: number; y: number; w: number; h: number }, s: number) => ({
  x: b.x + (b.w * (1 - s)) / 2,
  y: b.y + (b.h * (1 - s)) / 2,
  w: b.w * s,
  h: b.h * s,
});

const isAction = (k: string) => CHARACTER_ACTION_EFFECTS.includes(k as EffectKind);
const tierOf = (el: CharacterElement): "hero" | "ambient" => (el.kind === "figure" ? "hero" : el.tier ?? "hero");

/** poses for a figure, prepending a walk-in stride when `enter: "walk"`. */
function figurePoses(el: CharacterElement): StickPose[] {
  const base: StickPose[] = el.poses ?? [el.pose ?? "standing"];
  if (el.enter === "walk" && base[0] !== "walking") return ["walking", ...base];
  return base;
}

/** Local-unit slide so a walk-in figure starts just off the frame edge. */
function enterSlideFor(box: { x: number; y: number; w: number; h: number }, flip: boolean): number {
  const s = Math.min(box.w / 100, box.h / 200);
  const offsetX = box.x + (box.w - 100 * s) / 2;
  return flip ? (VIDEO.width - offsetX) / s + 10 : -(offsetX / s + 110);
}

type Box = { x: number; y: number; w: number; h: number };

/** Ambient props: colored flat art placed by grid that WASHES IN (no pen). */
const AmbientLayer: React.FC<{ items: { el: CharacterElement; box: Box }[]; frame: number }> = ({ items, frame }) => {
  if (items.length === 0) return null;
  const op = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{ position: "absolute", inset: 0, opacity: op }}>
      {items.map(({ el, box }, idx) => {
        const s = propShape(el.kind as PropKind, { variant: el.variant, state: el.state });
        const sc = Math.min(box.w / s.viewBox.w, box.h / s.viewBox.h);
        const tx = box.x + (box.w - s.viewBox.w * sc) / 2;
        const ty = box.y + (box.h - s.viewBox.h * sc) / 2;
        const sw = 4 / sc;
        return (
          <g key={idx} transform={`translate(${tx} ${ty}) scale(${sc})`}>
            {s.fills?.map((f, i) => (
              <path key={`f${i}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />
            ))}
            {s.strokes.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={COLORS.ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={0.72} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

/** Build-time composition check: warn if two hero boxes overlap significantly. */
function warnCollisions(hero: { key: string; box: Box }[]) {
  for (let i = 0; i < hero.length; i++) {
    for (let j = i + 1; j < hero.length; j++) {
      const a = hero[i]!.box;
      const b = hero[j]!.box;
      const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const inter = ox * oy;
      const minArea = Math.min(a.w * a.h, b.w * b.h);
      if (minArea > 0 && inter > minArea * 0.3) {
        console.warn(`⚠ composition: hero boxes "${hero[i]!.key}" and "${hero[j]!.key}" overlap ${((inter / minArea) * 100).toFixed(0)}%`);
      }
    }
  }
}

export const CharacterScene: React.FC<{
  visual: { title?: string; stage?: StageName; elements: CharacterElement[] };
  words: WordTiming[];
}> = ({ visual, words }) => {
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const frame = useCurrentFrame();
  const stage: StageName = visual.stage ?? "plain";

  // Pre-compute positioned elements.
  const built = visual.elements.map((el, i) => {
    const box0 = gridBox(el.at);
    const box = el.scale ? shrink(box0, el.scale) : box0;
    const color = el.color === "accent" ? brand.accent : COLORS.ink;
    const start = syncStartFrame(words, el.sync, fps, 0);
    const key = el.id ?? `${el.kind}-${i}`;
    const flip = el.facing === "left";
    const poses = el.kind === "figure" ? figurePoses(el) : [];
    const expr0: Expression =
      (typeof el.expressions?.[0] === "string" ? (el.expressions[0] as Expression) : el.expressions?.[0]?.value) ??
      el.expression ??
      "neutral";
    return { el, box, color, start, key, flip, poses, expr0, tier: tierOf(el) };
  });

  // Reveal: "draw" = the hand draws it (pen); everything else arrives without
  // the pen. Default by tier (ambient → wash) unless the element overrides.
  const effReveal = (b: (typeof built)[number]): "draw" | Reveal =>
    (b.el.reveal as "draw" | Reveal | undefined) ?? (b.tier === "ambient" ? "wash" : "draw");
  const crowdBuilt = built.filter((b) => b.el.kind === "crowd");
  const figureBuilt = built.filter((b) => b.el.kind === "figure");
  const propBuilt = built.filter((b) => b.el.kind !== "figure" && b.el.kind !== "crowd");
  const penBuilt = [...figureBuilt, ...propBuilt.filter((b) => effReveal(b) === "draw")];
  const revealBuilt = propBuilt.filter((b) => effReveal(b) !== "draw");
  const toRevealItems = (list: typeof revealBuilt): RevealItem[] =>
    list.map((b) => ({ key: b.key, kind: b.el.kind as PropKind, variant: b.el.variant, state: b.el.state, box: b.box, reveal: effReveal(b) as Reveal, start: b.start }));
  const revealBehind = toRevealItems(revealBuilt.filter((b) => b.tier === "ambient"));
  const revealFront = toRevealItems(revealBuilt.filter((b) => b.tier !== "ambient"));
  if (frame === 0) warnCollisions(penBuilt.map((b) => ({ key: b.key, box: b.box })));

  // Plan the pen elements (cast + draw-reveal props); everything else arrives
  // without the pen (crowd/reveal layers).
  const planElements: BoardElement[] = penBuilt.map(({ el, box, color, start, key, flip, poses, expr0 }) => ({
    key,
    shape:
      el.kind === "figure"
        ? {
            viewBox: { w: 100, h: 200 },
            strokes:
              el.enter === "walk"
                ? []
                : castOutlineStrokes(el.cast as CastId, poses[0]!, { flip, expression: expr0, seat: el.seat, view: el.view as CastView | undefined }),
          }
        : propShape(el.kind as PropKind, { variant: el.variant, state: el.state }),
    box,
    startFrame: start,
    strokeColor: color,
    strokeWidth: STROKE,
  }));
  const drawEnd = buildPlan(planElements, fps).drawEndByKey;
  const doneOf = (key: string) => (drawEnd[key] ?? 80) + 6;

  const elements: BoardElement[] = [];
  const overlays: { key: string; kind: EffectKind; x: number; y: number; size: number; start: number; loop?: boolean; duration?: number }[] = [];

  penBuilt.forEach(({ el, box, color, start, key, flip, poses, expr0 }) => {
    if (el.kind === "figure") {
      let expressions: Expression[] | undefined;
      let expressionSteps: ExprStep[] | undefined;
      if (el.expressions && el.expressions.length) {
        const cues = el.expressions.map((c) => (typeof c === "string" ? { value: c } : c));
        if (cues.some((c) => "sync" in c && c.sync)) {
          expressionSteps = cues.map((c, idx) => ({
            value: c.value as Expression,
            atFrame: "sync" in c && c.sync ? Math.max(syncStartFrame(words, c.sync, fps, doneOf(key)), doneOf(key)) : idx === 0 ? 0 : doneOf(key),
          }));
        } else {
          expressions = cues.map((c) => c.value as Expression);
        }
      } else {
        expressions = [expr0];
      }

      const actionFx = el.effects?.find((f) => isAction(f.kind));
      const actionStart = actionFx ? Math.max(syncStartFrame(words, actionFx.sync, fps, doneOf(key)), doneOf(key)) : 0;

      elements.push(
        castBoardElement({
          key,
          castId: el.cast as CastId,
          box,
          startFrame: start,
          sceneFrame: frame,
          poses,
          expressions,
          expressionSteps,
          flip,
          view: el.view as CastView | undefined,
          seat: el.seat,
          holding: el.holding,
          entrance: el.enter,
          enterSlide: el.enter === "walk" ? enterSlideFor(box, flip) : undefined,
          action: actionFx ? { kind: actionFx.kind as "nod" | "headshake" | "shake", startFrame: actionStart } : undefined,
          label: el.label,
          seed: key,
        }),
      );
    } else {
      elements.push({
        key,
        shape: propShape(el.kind as PropKind, { variant: el.variant, state: el.state }),
        box,
        startFrame: start,
        strokeColor: color,
        strokeWidth: STROKE,
        label: el.label,
        labelAnchor: "bottom",
      });
    }
  });

  // Effects (overlays) can attach to any element — hero or ambient.
  built.forEach(({ el, box, key }) => {
    el.effects
      ?.filter((f) => !isAction(f.kind))
      .forEach((fx, fi) => {
        const anchor = fx.at ? gridBox(fx.at) : box;
        const cx = fx.at ? anchor.x + anchor.w / 2 : box.x + box.w / 2;
        const cy = fx.at ? anchor.y + anchor.h / 2 : box.y + box.h * 0.1;
        overlays.push({
          key: `${key}-fx${fi}`,
          kind: fx.kind as EffectKind,
          x: cx,
          y: cy,
          size: Math.min(260, Math.max(170, box.w * 0.6)),
          start: Math.max(syncStartFrame(words, fx.sync, fps, doneOf(key)), doneOf(key)),
          loop: fx.loop,
          duration: fx.duration,
        });
      });
  });

  const titleOpacity = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper }}>
      {/* z-order: stage → crowd → ambient reveals → title → pen heroes → front reveals → effects */}
      <Stage name={stage} frame={frame} />
      {crowdBuilt.map((b) => (
        <Crowd
          key={b.key}
          count={b.el.count ?? 4}
          arrangement={(b.el.arrangement as CrowdArrangement) ?? "row"}
          tint={b.el.tint}
          box={b.box}
          seed={`${b.key}-${b.el.count ?? 4}`}
          frame={frame - b.start}
        />
      ))}
      <RevealLayer items={revealBehind} frame={frame} fps={fps} />
      {visual.title && (
        <div
          style={{
            position: "absolute",
            top: 48,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontSize: LAYOUT.subtitleSize,
            color: COLORS.ink,
            opacity: titleOpacity,
          }}
        >
          {visual.title}
        </div>
      )}
      <DrawingBoard elements={elements} />
      <RevealLayer items={revealFront} frame={frame} fps={fps} />
      {overlays.map((o) => (
        <Effect key={o.key} kind={o.kind} x={o.x} y={o.y} size={o.size} frame={frame} startFrame={o.start} loop={o.loop} duration={o.duration} />
      ))}
    </AbsoluteFill>
  );
};
