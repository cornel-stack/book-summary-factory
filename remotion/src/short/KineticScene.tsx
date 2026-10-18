import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_FAMILY } from "../fonts";
import { propShape, type PropKind } from "../drawing/props";
import { resolvePhraseTime } from "../drawing/sync";
import type { KineticVisual, WordTiming } from "../schema";

/**
 * Kinetic motion-graphics shorts (no characters). Built from the Shorts research:
 * frame 0 fully composed (it is the feed thumbnail), a visual change every
 * ~1.5–2s, karaoke captions centered ~60% down (never in the bottom UI rail),
 * SFX on every beat, punch-in on each scene start. All geometry is 1080×1920.
 *
 * Zones: graphic y∈[260..1080] · captions y≈1180 · bottom 300px left for the
 * platform UI · right 80px clear of the action buttons.
 */

export const K = {
  bg: ["#232041", "#1B1930", "#2B2753"], // Indigo Deep family, rotated per scene
  text: "#FAF5EB",
  dim: "rgba(250,245,235,0.55)",
  amber: "#FFAE3D",
  coral: "#F4603E",
  green: "#4CC38A",
  disc: "#FAF5EB",
} as const;

const W = 1080;
const DISPLAY = FONT_FAMILY.display; // Anton
const BODY = FONT_FAMILY.body; // Inter
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const at = (words: WordTiming[], fps: number, sync: { phrase: string } | undefined, fallback: number) => {
  if (!sync) return fallback;
  const t = resolvePhraseTime(words, sync.phrase);
  return t === null ? fallback : Math.round(t * fps);
};

/** Spring pop that overshoots (0 → ~1.08 → 1). */
const usePop = (start: number, stiffness = 190) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping: 11, stiffness } });
};

/** One-shot SFX at a scene-local frame. */
export const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at: f, name, volume = 0.55 }) => (
  <Sequence from={Math.max(0, f)} durationInFrames={45} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
const POPS = ["pop1", "pop2", "pop3"];

/** A prop icon on a light disc (props are ink-on-paper art, so they need a paper base on the dark bg). */
export const IconDisc: React.FC<{ icon: PropKind; size: number; ring?: string }> = ({ icon, size, ring = K.amber }) => {
  const shape = propShape(icon);
  const inner = size * 0.62;
  const sc = Math.min(inner / shape.viewBox.w, inner / shape.viewBox.h);
  const ox = (size - shape.viewBox.w * sc) / 2;
  const oy = (size - shape.viewBox.h * sc) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={K.disc} />
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 5} fill="none" stroke={ring} strokeWidth={10} />
      <g transform={`translate(${ox} ${oy}) scale(${sc})`}>
        {shape.fills?.map((f, i) => <path key={`f${i}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />)}
        {shape.strokes.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#1C1A17" strokeWidth={5 / sc} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  );
};

/** Big display text; words listed in `accent` render amber on a coral marker. */
const PunchText: React.FC<{ text: string; accent: string[]; size: number; activeWord?: number }> = ({ text, accent, size, activeWord }) => {
  const acc = new Set(accent.map((a) => a.toLowerCase().replace(/[^a-z0-9%$]/g, "")));
  const words = text.split(/\s+/);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${size * 0.08}px ${size * 0.24}px`, lineHeight: 1.02 }}>
      {words.map((w, i) => {
        const isAcc = acc.has(w.toLowerCase().replace(/[^a-z0-9%$]/g, ""));
        return (
          <span
            key={i}
            style={{
              fontFamily: DISPLAY,
              fontSize: size,
              textTransform: "uppercase",
              color: isAcc ? "#1B1930" : K.text,
              background: isAcc ? K.amber : "transparent",
              padding: isAcc ? `0 ${size * 0.12}px` : 0,
              borderRadius: size * 0.08,
              transform: `scale(${activeWord === i ? 1.08 : 1}) rotate(${isAcc ? -2 : 0}deg)`,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Index of the word being spoken (for pulsing on-screen text in time with the voice). */
const spokenIndex = (words: WordTiming[], t: number) => {
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i]!.start <= t) idx = i;
  return idx;
};

// ── layouts ──────────────────────────────────────────────────────────────────

const Hook: React.FC<{ v: Extract<KineticVisual, { layout: "hook" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Fully composed at frame 0 — the slam is a shake + settle, never a fade-in.
  const settle = interpolate(frame, [0, 7], [1.12, 1], clamp);
  const shakeX = frame < 7 ? Math.sin(frame * 3.1) * (7 - frame) * 2.2 : 0;
  const size = v.text.length > 38 ? 118 : v.text.length > 24 ? 136 : 160;
  const iconPop = spring({ frame: frame + 6, fps, config: { damping: 9, stiffness: 170 } });
  const active = Math.min(spokenIndex(words, frame / fps), v.text.split(/\s+/).length - 1);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 260 }}>
      <Sfx at={0} name="impact" volume={0.7} />
      {v.icon && (
        <div style={{ marginBottom: 50, transform: `scale(${iconPop}) rotate(${Math.sin(frame / 9) * 4}deg)` }}>
          <IconDisc icon={v.icon} size={250} ring={K.coral} />
        </div>
      )}
      <div style={{ width: W - 160, transform: `translateX(${shakeX}px) scale(${settle})` }}>
        <PunchText text={v.text} accent={v.accent} size={size} activeWord={active} />
      </div>
    </AbsoluteFill>
  );
};

const Statement: React.FC<{ v: Extract<KineticVisual, { layout: "statement" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = at(words, fps, v.sync, 0);
  const pop = usePop(start);
  const iconPop = usePop(start + 8);
  const size = v.text.length > 44 ? 104 : v.text.length > 28 ? 122 : 140;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 360 }}>
      {v.icon && (
        <>
          <Sfx at={start + 8} name="pop1" />
          <div style={{ marginBottom: 44, transform: `scale(${iconPop})` }}>
            <IconDisc icon={v.icon} size={220} />
          </div>
        </>
      )}
      <div style={{ width: W - 160, opacity: Math.min(1, pop * 2), transform: `translateY(${(1 - pop) * 80}px) scale(${0.85 + pop * 0.15})` }}>
        <PunchText text={v.text} accent={v.accent} size={size} />
      </div>
    </AbsoluteFill>
  );
};

const NumberBeat: React.FC<{ v: Extract<KineticVisual, { layout: "number" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = at(words, fps, v.sync, 4);
  const COUNT = 32;
  const p = interpolate(frame, [start, start + COUNT], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const landed = frame >= start + COUNT;
  const burst = interpolate(frame, [start + COUNT, start + COUNT + 18], [0, 1], clamp);
  const land = spring({ frame: frame - start - COUNT, fps, config: { damping: 8, stiffness: 220 } });
  const val = (v.value * p).toFixed(v.decimals ?? (Number.isInteger(v.value) ? 0 : 1));
  const shown = `${v.prefix ?? ""}${Number(val).toLocaleString("en-US", { minimumFractionDigits: v.decimals ?? 0 })}${v.suffix ?? ""}`;
  const len = shown.length;
  const size = len > 8 ? 210 : len > 5 ? 270 : 340;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 330 }}>
      <Sfx at={start - 30} name="riser" volume={0.35} />
      <Sfx at={start + COUNT} name="ding" volume={0.5} />
      <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={W / 2} cy={640} r={180 + burst * 260} fill="none" stroke={K.amber} strokeWidth={14 * (1 - burst)} opacity={1 - burst} />
      </svg>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: size,
          color: K.amber,
          lineHeight: 1,
          transform: `scale(${frame < start ? 0.9 + Math.sin(frame / 5) * 0.06 : landed ? 1 + (1 - land) * 0.25 : 0.7 + p * 0.3})`,
          textShadow: "0 12px 0 rgba(0,0,0,0.25)",
        }}
      >
        {frame < start ? "?" : shown}
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 64, color: K.text, marginTop: 30, width: W - 200, textAlign: "center", opacity: interpolate(frame, [start + 10, start + 22], [0, 1], clamp) }}>
        {v.label}
      </div>
    </AbsoluteFill>
  );
};

const Versus: React.FC<{ v: Extract<KineticVisual, { layout: "versus" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ls = at(words, fps, v.left.sync, 0);
  const rs = at(words, fps, v.right.sync, ls + 18);
  const lp = usePop(ls, 150);
  const rp = usePop(rs, 150);
  const verdictAt = Math.max(ls, rs) + 22;
  const vp = usePop(verdictAt, 220);
  const vsPop = usePop(Math.min(ls, rs) + 6, 240);
  const side = (s: typeof v.left, p: number, from: -1 | 1, win: boolean | null) => (
    <div style={{ width: 440, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateX(${(1 - p) * from * 520}px)`, opacity: Math.min(1, p * 2) }}>
      {s.icon ? <IconDisc icon={s.icon} size={260} ring={win === null ? K.amber : win ? K.green : K.coral} /> : <div style={{ height: 260 }} />}
      <div style={{ fontFamily: DISPLAY, fontSize: 92, color: win === false ? K.dim : K.text, textTransform: "uppercase", marginTop: 34, textAlign: "center", lineHeight: 1 }}>{s.label}</div>
      {win !== null && (
        <div style={{ marginTop: 26, width: 110, height: 110, borderRadius: 55, background: win ? K.green : K.coral, color: "#fff", fontSize: 76, fontWeight: 800, fontFamily: BODY, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${vp})` }}>
          {win ? "✓" : "✕"}
        </div>
      )}
    </div>
  );
  const lw = v.winner ? v.winner === "left" : null;
  const rw = v.winner ? v.winner === "right" : null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingBottom: 380 }}>
      <Sfx at={ls} name="whoosh1" volume={0.45} />
      <Sfx at={rs} name="whoosh3" volume={0.45} />
      {v.winner && <Sfx at={verdictAt} name="ding" volume={0.4} />}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 70px", alignItems: "flex-start" }}>
        {side(v.left, lp, -1, lw)}
        {side(v.right, rp, 1, rw)}
      </div>
      <div style={{ position: "absolute", left: W / 2 - 75, top: 610, width: 150, height: 150, borderRadius: 75, background: K.coral, color: "#fff", fontFamily: DISPLAY, fontSize: 76, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${vsPop}) rotate(${(1 - vsPop) * -90}deg)` }}>
        VS
      </div>
    </AbsoluteFill>
  );
};

const Steps: React.FC<{ v: Extract<KineticVisual, { layout: "steps" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = v.items.length;
  const starts = v.items.map((it, i) => at(words, fps, it.sync, 8 + i * 30));
  const current = starts.reduce((acc, s, i) => (frame >= s ? i : acc), -1);
  const rowH = n > 4 ? 150 : 175;
  const top = v.title ? 420 : 330;
  return (
    <AbsoluteFill>
      {v.title && (
        <div style={{ position: "absolute", top: 260, width: W, textAlign: "center", fontFamily: DISPLAY, fontSize: 96, color: K.text, textTransform: "uppercase" }}>
          {v.title}
        </div>
      )}
      {v.items.map((it, i) => {
        const s = starts[i]!;
        const p = spring({ frame: frame - s, fps, config: { damping: 13, stiffness: 170 } });
        const isCur = i === current;
        const num = v.countdown ? n - i : i + 1;
        return (
          <div key={i}>
            <Sfx at={s} name={i % 2 ? "whoosh2" : POPS[i % 3]!} volume={0.45} />
            <div
              style={{
                position: "absolute",
                top: top + i * rowH,
                left: 90,
                width: W - 200,
                height: rowH - 26,
                display: "flex",
                alignItems: "center",
                gap: 34,
                padding: "0 30px",
                borderRadius: 28,
                background: isCur ? "rgba(255,174,61,0.16)" : "transparent",
                transform: `translateX(${(1 - p) * 700}px) scale(${isCur ? 1.03 : 1})`,
                opacity: frame < s ? 0 : current > i ? 0.5 : 1,
              }}
            >
              <div style={{ width: 104, height: 104, flex: "0 0 104px", borderRadius: 52, background: isCur ? K.amber : K.coral, color: "#1B1930", fontFamily: DISPLAY, fontSize: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {num}
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 74, color: K.text, textTransform: "uppercase", lineHeight: 1.02 }}>{it.label}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Icons: React.FC<{ v: Extract<KineticVisual, { layout: "icons" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = v.items.length;
  const starts = v.items.map((it, i) => at(words, fps, it.sync, 6 + i * 28));
  const top = v.title ? 400 : 300;
  const step = Math.min(250, (1080 - top) / n);
  const disc = Math.min(190, step - 40);
  return (
    <AbsoluteFill>
      {v.title && (
        <div style={{ position: "absolute", top: 250, width: W, textAlign: "center", fontFamily: DISPLAY, fontSize: 92, color: K.text, textTransform: "uppercase" }}>
          {v.title}
        </div>
      )}
      <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
        {v.items.slice(1).map((_, i) => {
          const y0 = top + i * step + disc + 6;
          const y1 = top + (i + 1) * step - 6;
          const p = interpolate(frame, [starts[i + 1]! - 10, starts[i + 1]!], [0, 1], clamp);
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <line x1={250} y1={y0} x2={250} y2={y0 + (y1 - y0) * p} stroke={K.amber} strokeWidth={10} strokeLinecap="round" />
              {p >= 1 && <path d={`M 232 ${y1 - 18} L 250 ${y1} L 268 ${y1 - 18}`} stroke={K.amber} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
      </svg>
      {v.items.map((it, i) => {
        const s = starts[i]!;
        const p = spring({ frame: frame - s, fps, config: { damping: 9, stiffness: 190 } });
        const live = frame >= s;
        return (
          <div key={i}>
            <Sfx at={s} name={POPS[i % 3]!} volume={0.55} />
            <div style={{ position: "absolute", top: top + i * step, left: 250 - disc / 2, transform: `scale(${live ? p : 0}) rotate(${(1 - p) * 30}deg)` }}>
              <IconDisc icon={it.icon} size={disc} ring={i === n - 1 ? K.coral : K.amber} />
            </div>
            <div style={{ position: "absolute", top: top + i * step + disc / 2 - 50, left: 250 + disc / 2 + 40, fontFamily: DISPLAY, fontSize: 88, color: K.text, textTransform: "uppercase", opacity: live ? Math.min(1, p * 1.5) : 0, transform: `translateX(${(1 - p) * 120}px)` }}>
              {it.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Curve: React.FC<{ v: Extract<KineticVisual, { layout: "curve" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = at(words, fps, v.sync, 6);
  const DRAW = 50;
  // Creep along the flat part from the first frame (never an empty chart), then
  // race up the steep part on the phrase.
  const p = frame < start
    ? interpolate(frame, [4, Math.max(5, start)], [0, 0.45], clamp)
    : interpolate(frame, [start, start + DRAW], [0.45, 1], { ...clamp, easing: (x) => x * x * (3 - 2 * x) });
  const x0 = 110, x1 = W - 130, yBase = 1000, yTop = 470, yStart = 880;
  const N = 60;
  // grow = exponential climb yStart→yTop; decay = slow droop yStart→yBase.
  const pt = (t: number, kind: "grow" | "decay") => {
    const x = x0 + (x1 - x0) * t;
    const y =
      kind === "grow"
        ? yStart - (yStart - yTop) * ((Math.exp(3.4 * t) - 1) / (Math.exp(3.4) - 1))
        : yStart + (yBase - 20 - yStart) * ((1 - Math.exp(-2.2 * t)) / (1 - Math.exp(-2.2)));
    return [x, y] as const;
  };
  const path = (kind: "grow" | "decay") =>
    Array.from({ length: N + 1 }, (_, i) => pt((i / N) * p, kind))
      .map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ");
  const head = pt(p, "grow");
  const endPop = spring({ frame: frame - start - DRAW, fps, config: { damping: 9, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <Sfx at={start} name="riser" volume={0.3} />
      <Sfx at={start + DRAW} name="ding" volume={0.45} />
      <div style={{ position: "absolute", top: 250, width: W, textAlign: "center", fontFamily: DISPLAY, fontSize: 88, color: K.text, textTransform: "uppercase" }}>{v.label}</div>
      <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={x0} y1={yBase} x2={x1} y2={yBase} stroke={K.dim} strokeWidth={4} />
        {v.contrast && <path d={path("decay")} stroke={K.coral} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.85} />}
        <path d={path("grow")} stroke={K.amber} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={head[0]} cy={head[1]} r={22 + Math.sin(frame / 4) * 4} fill={K.amber} />
        <circle cx={head[0]} cy={head[1]} r={44} fill={K.amber} opacity={0.25} />
      </svg>
      <div style={{ position: "absolute", left: x1 - 620, top: yTop - 30, width: 520, textAlign: "right", fontFamily: DISPLAY, fontSize: 110, color: K.amber, transform: `scale(${endPop})`, transformOrigin: "right bottom" }}>{v.to}</div>
      {v.contrast && (
        <div style={{ position: "absolute", left: x1 - 460, top: yBase - 110, width: 520, textAlign: "right", fontFamily: DISPLAY, fontSize: 64, color: K.coral, opacity: p }}>{v.contrast}</div>
      )}
    </AbsoluteFill>
  );
};

const Quote: React.FC<{ v: Extract<KineticVisual, { layout: "quote" }>; words: WordTiming[] }> = ({ v, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const qWords = v.quote.split(/\s+/);
  // map spoken words onto the quote words in order (the narration reads the quote first)
  const spoken = Math.min(qWords.length - 1, spokenIndex(words, t));
  const markPop = usePop(0, 160);
  const size = v.quote.length > 110 ? 70 : v.quote.length > 70 ? 82 : 96;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 300 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 300, color: K.coral, lineHeight: 0.6, height: 150, transform: `scale(${markPop})` }}>“</div>
      <div style={{ width: W - 180, textAlign: "center", fontFamily: BODY, fontWeight: 600, fontSize: size, lineHeight: 1.22 }}>
        {qWords.map((w, i) => (
          <span key={i} style={{ color: i <= spoken ? K.text : "rgba(250,245,235,0.28)", background: i === spoken ? "rgba(255,174,61,0.35)" : "transparent", borderRadius: 10 }}>
            {w}{" "}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 44, fontFamily: DISPLAY, fontSize: 56, color: K.amber, textTransform: "uppercase", letterSpacing: 2 }}>— {v.attribution}</div>
    </AbsoluteFill>
  );
};

export const KineticBeat: React.FC<{ visual: KineticVisual; words: WordTiming[] }> = ({ visual, words }) => {
  switch (visual.layout) {
    case "hook":
      return <Hook v={visual} words={words} />;
    case "statement":
      return <Statement v={visual} words={words} />;
    case "number":
      return <NumberBeat v={visual} words={words} />;
    case "versus":
      return <Versus v={visual} words={words} />;
    case "steps":
      return <Steps v={visual} words={words} />;
    case "icons":
      return <Icons v={visual} words={words} />;
    case "curve":
      return <Curve v={visual} words={words} />;
    case "quote":
      return <Quote v={visual} words={words} />;
  }
};

/** Layouts that already put the spoken words on screen — no karaoke captions on top. */
export const SELF_CAPTIONED = new Set<KineticVisual["layout"]>(["hook", "quote"]);

// ── karaoke captions ─────────────────────────────────────────────────────────

/** 1–3 word chunks, broken early at punctuation (research: 1–3 words per screen). */
function chunk(words: WordTiming[], narration?: string): WordTiming[][] {
  // TTS word timings often drop punctuation; borrow it from the narration when
  // the token counts line up so chunks break at sentence/clause ends.
  const toks = narration?.trim().split(/\s+/) ?? [];
  const punct = (i: number) => (toks.length === words.length ? toks[i]! : words[i]!.text);
  const out: WordTiming[][] = [];
  let cur: WordTiming[] = [];
  for (const [i, w] of words.entries()) {
    cur.push(w);
    const len = cur.map((x) => x.text).join(" ").length;
    if (cur.length >= 3 || len > 16 || /[.,!?;:]$/.test(punct(i))) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

export const KineticCaptions: React.FC<{ words: WordTiming[]; narration?: string; y?: number }> = ({ words, narration, y = 1170 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!words.length) return null;
  const t = frame / fps;
  const chunks = chunk(words, narration);
  let ci = chunks.findIndex((c) => t >= c[0]!.start && t <= c[c.length - 1]!.end + 0.08);
  if (ci < 0) {
    ci = -1;
    chunks.forEach((c, i) => {
      if (c[0]!.start <= t) ci = i;
    });
  }
  if (ci < 0) return null;
  const c = chunks[ci]!;
  const chunkStart = Math.round(c[0]!.start * fps);
  const enter = spring({ frame: frame - chunkStart, fps, config: { damping: 14, stiffness: 260 } });
  return (
    <div style={{ position: "absolute", top: y, left: 80, width: W - 180, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 44px", transform: `scale(${0.8 + enter * 0.2})` }}>
      {c.map((w, i) => {
        const active = t >= w.start && (i === c.length - 1 || t < c[i + 1]!.start);
        return (
          <span
            key={i}
            style={{
              fontFamily: DISPLAY,
              fontSize: 96,
              textTransform: "uppercase",
              color: active ? K.amber : "#FFFFFF",
              WebkitTextStroke: "14px #0E0C1A",
              paintOrder: "stroke fill",
              transform: `scale(${active ? 1.15 : 1})`,
              display: "inline-block",
              lineHeight: 1.1,
            }}
          >
            {w.text.replace(/[.,;:]$/, "")}
          </span>
        );
      })}
    </div>
  );
};
