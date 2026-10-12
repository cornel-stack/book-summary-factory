import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";
import { useBrand } from "../brand";
import { DrawingBoard } from "../components/DrawingBoard";
import { castBoardElement, castOutlineStrokes, type ExprStep } from "../components/CastCharacter";
import { Effect, CHARACTER_ACTION_EFFECTS, type EffectKind } from "../components/Effects";
import { BurnedCaptions } from "../components/BurnedCaptions";
import type { Expression } from "../drawing/character";
import type { StickPose } from "../drawing/stick";
import type { CastView } from "../drawing/castPose";
import { propShape, type PropKind } from "../drawing/props";
import type { CastId } from "../drawing/cast";
import { syncStartFrame } from "../drawing/layout";
import { buildPlan } from "../drawing/plan";
import type { BoardElement } from "../drawing/types";
import { listIcon, circleBadge, quoteMark } from "../drawing/icons";
import type { Scene, WordTiming, CharacterElement } from "../schema";
import { VerticalBackdrop } from "./VerticalBackdrop";
import {
  VW,
  VH,
  CONTENT_BOTTOM_EDGE,
  ART_BOTTOM,
  TEXT,
  type Box,
  heroFigureBox,
  duoFigureBox,
  metaphorBox,
  verticalEnterSlide,
} from "./verticalLayout";

const STROKE = 6;
const isAction = (k: string) => CHARACTER_ACTION_EFFECTS.includes(k as EffectKind);

type CharV = Extract<Scene, { type: "character_scene" }>["visual"];
type TitleV = Extract<Scene, { type: "section_title" }>["visual"];
type ListV = Extract<Scene, { type: "list_card" }>["visual"];
type RecapV = Extract<Scene, { type: "recap_card" }>["visual"];
type QuoteV = Extract<Scene, { type: "quote_card" }>["visual"];
type StatV = Extract<Scene, { type: "stat_chart" }>["visual"];

/** Burned karaoke captions in the bottom rail — the core engagement driver. */
const SceneCaptions: React.FC<{ words: WordTiming[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <BurnedCaptions words={words} frame={frame} fps={fps} bottom={CONTENT_BOTTOM_EDGE} width={VW} />;
};

// ---------------------------------------------------------------------------
// character_scene — a BIG centered hero figure + optional top metaphor prop.
// ---------------------------------------------------------------------------
const VCharacterScene: React.FC<{ visual: CharV; words: WordTiming[]; compact?: boolean }> = ({
  visual,
  words,
  compact,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const figures = visual.elements.filter((e) => e.kind === "figure");
  const props = visual.elements.filter((e) => e.kind !== "figure" && e.kind !== "crowd");
  const hasTitle = !!visual.title;
  const lowered = !!compact || props.length > 0;

  const figBox = (i: number): Box => (figures.length > 1 ? duoFigureBox(i) : heroFigureBox({ lowered }));
  const propBox = (i: number): Box => metaphorBox({ hasTitle, count: props.length, index: i });

  const keyOf = (el: CharacterElement, i: number, tag: string) => el.id ?? `${tag}-${el.kind}-${i}`;
  const startOf = (el: CharacterElement) => syncStartFrame(words, el.sync, fps, 0);
  const expr0Of = (el: CharacterElement): Expression =>
    (typeof el.expressions?.[0] === "string"
      ? (el.expressions[0] as Expression)
      : el.expressions?.[0]?.value) ??
    el.expression ??
    "neutral";

  // Plan the pen elements (figures + hand-drawn props) to learn each draw-end,
  // which gates expression swings + effects (mirrors CharacterScene).
  const penPlan: BoardElement[] = [
    ...figures.map((el, i) => {
      const flip = el.facing === "left";
      const base: StickPose[] = el.poses ?? [el.pose ?? "standing"];
      const poses: StickPose[] = el.enter === "walk" && base[0] !== "walking" ? ["walking", ...base] : base;
      return {
        key: keyOf(el, i, "fig"),
        shape: {
          viewBox: { w: 100, h: 200 },
          strokes:
            el.enter === "walk"
              ? []
              : castOutlineStrokes(el.cast as CastId, poses[0]!, {
                  flip,
                  expression: expr0Of(el),
                  seat: el.seat,
                  view: el.view as CastView | undefined,
                }),
        },
        box: figBox(i),
        startFrame: startOf(el),
        strokeColor: COLORS.ink,
        strokeWidth: STROKE,
      } as BoardElement;
    }),
    ...props.map((el, i) => ({
      key: keyOf(el, i, "prop"),
      shape: propShape(el.kind as PropKind, { variant: el.variant, state: el.state }),
      box: propBox(i),
      startFrame: startOf(el),
      strokeColor: el.color === "accent" ? COLORS.ink : COLORS.ink,
      strokeWidth: STROKE,
    } as BoardElement)),
  ];
  const drawEnd = buildPlan(penPlan, fps).drawEndByKey;
  const doneOf = (key: string) => (drawEnd[key] ?? 80) + 6;

  const elements: BoardElement[] = [];
  const overlays: { key: string; kind: EffectKind; x: number; y: number; size: number; start: number; loop?: boolean; duration?: number }[] = [];

  figures.forEach((el, i) => {
    const key = keyOf(el, i, "fig");
    const box = figBox(i);
    const flip = el.facing === "left";
    const base: StickPose[] = el.poses ?? [el.pose ?? "standing"];
    const poses: StickPose[] = el.enter === "walk" && base[0] !== "walking" ? ["walking", ...base] : base;

    let expressions: Expression[] | undefined;
    let expressionSteps: ExprStep[] | undefined;
    if (el.expressions && el.expressions.length) {
      const cues = el.expressions.map((c) => (typeof c === "string" ? { value: c } : c));
      if (cues.some((c) => "sync" in c && c.sync)) {
        expressionSteps = cues.map((c, idx) => ({
          value: c.value as Expression,
          atFrame:
            "sync" in c && c.sync
              ? Math.max(syncStartFrame(words, c.sync, fps, doneOf(key)), doneOf(key))
              : idx === 0
                ? 0
                : doneOf(key),
        }));
      } else {
        expressions = cues.map((c) => c.value as Expression);
      }
    } else {
      expressions = [expr0Of(el)];
    }

    const actionFx = el.effects?.find((f) => isAction(f.kind));
    const actionStart = actionFx ? Math.max(syncStartFrame(words, actionFx.sync, fps, doneOf(key)), doneOf(key)) : 0;

    elements.push(
      castBoardElement({
        key,
        castId: el.cast as CastId,
        box,
        startFrame: startOf(el),
        sceneFrame: frame,
        poses,
        expressions,
        expressionSteps,
        flip,
        view: el.view as CastView | undefined,
        seat: el.seat,
        holding: el.holding,
        entrance: el.enter,
        enterSlide: el.enter === "walk" ? verticalEnterSlide(box, flip) : undefined,
        action: actionFx ? { kind: actionFx.kind as "nod" | "headshake" | "shake", startFrame: actionStart } : undefined,
        label: el.label,
        seed: key,
      }),
    );
  });

  props.forEach((el, i) => {
    const key = keyOf(el, i, "prop");
    elements.push({
      key,
      shape: propShape(el.kind as PropKind, { variant: el.variant, state: el.state }),
      box: propBox(i),
      startFrame: startOf(el),
      strokeColor: COLORS.ink,
      strokeWidth: STROKE,
      label: el.label,
      labelAnchor: "bottom",
    });
  });

  // Non-action effects anchor on their owning element (figure or prop).
  [...figures, ...props].forEach((el, i) => {
    const isFig = el.kind === "figure";
    const key = keyOf(el, isFig ? figures.indexOf(el) : props.indexOf(el), isFig ? "fig" : "prop");
    const box = isFig ? figBox(figures.indexOf(el)) : propBox(props.indexOf(el));
    el.effects
      ?.filter((f) => !isAction(f.kind))
      .forEach((fx, fi) => {
        overlays.push({
          key: `${key}-fx${fi}`,
          kind: fx.kind as EffectKind,
          x: box.x + box.w / 2,
          y: box.y + box.h * 0.12,
          size: Math.min(300, Math.max(200, box.w * 0.6)),
          start: Math.max(syncStartFrame(words, fx.sync, fps, doneOf(key)), doneOf(key)),
          loop: fx.loop,
          duration: fx.duration,
        });
      });
  });

  const titleOpacity = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <VerticalBackdrop />
      {visual.title && (
        <div
          style={{
            position: "absolute",
            top: 170,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontSize: 78,
            color: COLORS.ink,
            opacity: titleOpacity,
          }}
        >
          {visual.title}
        </div>
      )}
      <DrawingBoard elements={elements} />
      {overlays.map((o) => (
        <Effect key={o.key} kind={o.kind} x={o.x} y={o.y} size={o.size} frame={frame} startFrame={o.start} loop={o.loop} duration={o.duration} />
      ))}
      <SceneCaptions words={words} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// section_title — one giant hand-lettered title + accent emphasis.
// ---------------------------------------------------------------------------
const VSectionTitle: React.FC<{ visual: TitleV; words: WordTiming[] }> = ({ visual, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();

  const pop = spring({ frame, fps, config: { damping: 180 }, durationInFrames: 22 });
  const titleY = interpolate(frame, [6, 20], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kicker =
    visual.role === "part" ? `PART ${visual.number ?? ""}`.trim() : visual.role === "principle" ? `PRINCIPLE ${visual.number ?? ""}`.trim() : null;

  const markStart = syncStartFrame(words, visual.sync, fps, 18);
  const markW = Math.min(820, Math.max(360, visual.title.length * 58));
  const markP = interpolate(frame, [markStart, markStart + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const grad = brand.gradient ? `linear-gradient(${brand.gradient.angleDeg}deg, ${brand.gradient.from}, ${brand.gradient.to})` : undefined;
  const isCircle = visual.emphasis === "circle";

  return (
    <AbsoluteFill>
      <VerticalBackdrop showGroundLine={false} />
      {kicker && (
        <div
          style={{
            position: "absolute",
            top: TEXT.kickerY,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.body,
            fontWeight: 800,
            letterSpacing: 10,
            fontSize: 46,
            color: brand.accent,
            opacity: Math.min(1, pop),
          }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: TEXT.heroTitleY,
          width: VW - 120,
          left: 60,
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: TEXT.heroTitleSize,
          lineHeight: 1.02,
          color: COLORS.ink,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {visual.title}
      </div>
      {isCircle ? (
        <svg
          width={VW}
          height={VH}
          viewBox={`0 0 ${VW} ${VH}`}
          style={{ position: "absolute", left: 0, top: 0, opacity: markP }}
        >
          <ellipse
            cx={VW / 2}
            cy={TEXT.heroTitleY + 95}
            rx={markW / 2 + 40}
            ry={120}
            fill="none"
            stroke={brand.accent}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={Math.PI * (markW + 80)}
            strokeDashoffset={(1 - markP) * Math.PI * (markW + 80)}
          />
        </svg>
      ) : (
        <div
          style={{
            position: "absolute",
            top: TEXT.heroTitleY + TEXT.heroTitleSize + 20,
            left: (VW - markW) / 2,
            width: markW * markP,
            height: 18,
            borderRadius: 9,
            background: grad ?? brand.accent,
          }}
        />
      )}
      <SceneCaptions words={words} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// list_card — vertical stack of big labels with accent icon chips.
// ---------------------------------------------------------------------------
const IconChip: React.FC<{ shape: { viewBox: { w: number; h: number }; strokes: string[] }; color: string; size: number; x: number; y: number }> = ({
  shape,
  color,
  size,
  x,
  y,
}) => {
  const sc = size / shape.viewBox.w;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${shape.viewBox.w} ${shape.viewBox.h}`} style={{ position: "absolute", left: x, top: y }}>
      {shape.strokes.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={8 / sc} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
};

const VListCard: React.FC<{ visual: ListV; words: WordTiming[] }> = ({ visual, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const items = visual.items;
  const step = Math.min(TEXT.listStep, (ART_BOTTOM - TEXT.listStartY) / items.length);
  const iconSize = 88;

  return (
    <AbsoluteFill>
      <VerticalBackdrop showGroundLine={false} />
      {visual.title && (
        <div
          style={{
            position: "absolute",
            top: TEXT.titleY,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: 118,
            color: COLORS.ink,
            opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {visual.title}
        </div>
      )}
      {items.map((it, i) => {
        const y = TEXT.listStartY + i * step;
        const start = it.sync ? syncStartFrame(words, it.sync, fps, i * 7) : i * 7;
        const t = interpolate(frame, [start, start + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (t <= 0) return null;
        return (
          <div key={i} style={{ opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
            <IconChip shape={listIcon(it.icon)} color={brand.accent} size={iconSize} x={TEXT.listIconX} y={y} />
            <div
              style={{
                position: "absolute",
                left: TEXT.listLabelX,
                top: y + 2,
                width: VW - TEXT.listLabelX - 80,
                fontFamily: FONTS.body,
                fontWeight: 800,
                fontSize: TEXT.listLabelSize,
                color: COLORS.ink,
              }}
            >
              {it.label}
            </div>
          </div>
        );
      })}
      <SceneCaptions words={words} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// recap_card — numbered badges + labels.
// ---------------------------------------------------------------------------
const VRecapCard: React.FC<{ visual: RecapV; words: WordTiming[] }> = ({ visual, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const items = visual.items;
  const step = Math.min(TEXT.listStep, (ART_BOTTOM - TEXT.listStartY) / items.length);
  const badge = circleBadge();
  const size = 96;

  return (
    <AbsoluteFill>
      <VerticalBackdrop showGroundLine={false} />
      <div
        style={{
          position: "absolute",
          top: TEXT.titleY,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: 118,
          color: COLORS.ink,
          opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {visual.title ?? "Remember this"}
      </div>
      {items.map((it, i) => {
        const y = TEXT.listStartY + i * step;
        const start = it.sync ? syncStartFrame(words, it.sync, fps, i * 8) : i * 8;
        const t = interpolate(frame, [start, start + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        if (t <= 0) return null;
        const sc = size / badge.viewBox.w;
        return (
          <div key={i} style={{ opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
            <svg width={size} height={size} viewBox={`0 0 ${badge.viewBox.w} ${badge.viewBox.h}`} style={{ position: "absolute", left: TEXT.listIconX, top: y }}>
              {badge.strokes.map((d, k) => (
                <path key={k} d={d} fill="none" stroke={brand.accent} strokeWidth={6 / sc} />
              ))}
            </svg>
            <div
              style={{
                position: "absolute",
                left: TEXT.listIconX,
                top: y,
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.heading,
                fontWeight: 700,
                fontSize: 56,
                color: brand.accent,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                position: "absolute",
                left: TEXT.listLabelX,
                top: y + 10,
                width: VW - TEXT.listLabelX - 80,
                fontFamily: FONTS.body,
                fontWeight: 800,
                fontSize: TEXT.listLabelSize,
                color: COLORS.ink,
              }}
            >
              {it.label}
            </div>
          </div>
        );
      })}
      <SceneCaptions words={words} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// quote_card — big centered quote + attribution.
// ---------------------------------------------------------------------------
function toLines(text: string, perLine = 5): string[] {
  const w = text.split(/\s+/);
  const lines: string[] = [];
  for (let i = 0; i < w.length; i += perLine) lines.push(w.slice(i, i + perLine).join(" "));
  return lines;
}

const VQuoteCard: React.FC<{ visual: QuoteV; words: WordTiming[] }> = ({ visual, words }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const lines = toLines(visual.quote.replace(/^[""]|[""]$/g, ""));
  const mark = quoteMark();
  const markSc = 200 / mark.viewBox.w;

  return (
    <AbsoluteFill>
      <VerticalBackdrop showGroundLine={false} />
      <svg width={200} height={200 * (mark.viewBox.h / mark.viewBox.w)} viewBox={`0 0 ${mark.viewBox.w} ${mark.viewBox.h}`} style={{ position: "absolute", left: 90, top: 360 }}>
        {mark.strokes.map((d, i) => (
          <path key={i} d={d} fill={brand.accent} stroke={brand.accent} strokeWidth={2 / markSc} />
        ))}
      </svg>
      <div style={{ position: "absolute", top: 560, left: 80, width: VW - 160, textAlign: "center" }}>
        {lines.map((ln, i) => {
          const t = interpolate(frame, [i * 8, i * 8 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                fontFamily: FONTS.heading,
                fontWeight: 700,
                fontSize: TEXT.quoteSize,
                lineHeight: 1.12,
                color: COLORS.ink,
                opacity: t,
                transform: `translateY(${(1 - t) * 12}px)`,
              }}
            >
              {ln}
            </div>
          );
        })}
        <div style={{ marginTop: 50, fontFamily: FONTS.body, fontWeight: 700, fontSize: 56, color: brand.accent }}>
          — {visual.attribution}
        </div>
      </div>
      <SceneCaptions words={words} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// stat_chart — the "aha" number + two hand-drawn trajectory curves.
// ---------------------------------------------------------------------------
const VStatChart: React.FC<{ visual: StatV; words: WordTiming[] }> = ({ visual, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();

  // Hero = the largest-magnitude datapoint; display big.
  const hero = visual.datapoints.reduce((a, b) => (Math.abs(b.value) > Math.abs(a.value) ? b : a), visual.datapoints[0]!);
  const heroStr = Math.abs(hero.value) >= 2 ? `${Math.round(hero.value)}×` : `${hero.value}`;
  const heroStart = hero.sync ? syncStartFrame(words, hero.sync, fps, 30) : 30;
  const pop = spring({ frame: frame - heroStart, fps, config: { damping: 12, stiffness: 150, mass: 0.8 } });

  // Two hand-drawn curves (up = accent "better", down/flat = soft "worse"),
  // each starting on its datapoint's sync. Box in frame px, local 800×460.
  const chartBox: Box = { x: 140, y: 820, w: 800, h: 480 };
  const up = visual.datapoints.find((d) => d.value >= 1) ?? visual.datapoints[visual.datapoints.length - 1]!;
  const down = visual.datapoints.find((d) => d.value < 1) ?? visual.datapoints[0]!;
  const upStart = up.sync ? syncStartFrame(words, up.sync, fps, 20) : 20;
  const downStart = down.sync ? syncStartFrame(words, down.sync, fps, 8) : 8;

  const curves: BoardElement[] = [
    {
      key: "stat-down",
      shape: { viewBox: { w: 800, h: 460 }, strokes: ["M 20 420 C 280 430 540 445 780 452"] },
      box: chartBox,
      startFrame: downStart,
      strokeColor: COLORS.inkSoft,
      strokeWidth: 7,
      label: down.label,
      labelAnchor: "bottom",
      labelColor: COLORS.inkSoft,
    },
    {
      key: "stat-up",
      shape: { viewBox: { w: 800, h: 460 }, strokes: ["M 20 420 C 300 405 560 320 780 24"] },
      box: chartBox,
      startFrame: upStart,
      strokeColor: brand.accent,
      strokeWidth: 10,
      label: up.label,
      labelAnchor: "top",
      labelColor: brand.accent,
    },
  ];

  return (
    <AbsoluteFill>
      <VerticalBackdrop showGroundLine={false} />
      <div
        style={{
          position: "absolute",
          top: TEXT.titleY,
          width: "100%",
          textAlign: "center",
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: 110,
          color: COLORS.ink,
          opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {visual.label}
      </div>
      <DrawingBoard elements={curves} />
      {frame >= heroStart && (
        <div
          style={{
            position: "absolute",
            top: 560,
            right: 120,
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: 190,
            color: brand.accent,
            transform: `scale(${Math.max(0.01, Math.min(1.08, pop))})`,
            transformOrigin: "right center",
          }}
        >
          {heroStr}
        </div>
      )}
      <SceneCaptions words={words} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
export const VerticalScene: React.FC<{ scene: Scene; words: WordTiming[]; isHook?: boolean }> = ({ scene, words, isHook }) => {
  switch (scene.type) {
    case "character_scene":
      return <VCharacterScene visual={scene.visual} words={words} compact={isHook} />;
    case "section_title":
      return <VSectionTitle visual={scene.visual} words={words} />;
    case "list_card":
      return <VListCard visual={scene.visual} words={words} />;
    case "recap_card":
      return <VRecapCard visual={scene.visual} words={words} />;
    case "quote_card":
      return <VQuoteCard visual={scene.visual} words={words} />;
    case "stat_chart":
      return <VStatChart visual={scene.visual} words={words} />;
    case "compare":
    case "table":
      // Shorts don't use compare/table (derive_shorts only picks char/list); longform only.
      return null;
    case "cta":
      // The end card renders full-frame brand chrome upstream (ShortEndCard).
      return null;
  }
};
