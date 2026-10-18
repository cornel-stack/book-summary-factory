import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { RenderProps } from "./schema";
import { COLORS, FONTS, SHORT_SAFE, VIDEO_VERTICAL } from "./theme";
import { BrandProvider, useBrand } from "./brand";
import { getBrand, activeCta, type Brand } from "../../config/brands";
import { VerticalScene } from "./short/VerticalScene";
import { KineticBeat, KineticCaptions, SELF_CAPTIONED, Sfx, K } from "./short/KineticScene";

const W = VIDEO_VERTICAL.width;
const H = VIDEO_VERTICAL.height;

function hexA(hex: string, a: number) {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return `${hex}${aa}`;
}

/** The brand end-card: wordmark + domain + CTA chip. */
const ShortEndCard: React.FC<{ brand: Brand }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 160 }, durationInFrames: 22 });
  const grad = brand.gradient
    ? `linear-gradient(${brand.gradient.angleDeg}deg, ${brand.gradient.from}, ${brand.gradient.to})`
    : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: brand.chrome.bg, justifyContent: "center", alignItems: "center" }}>
      {/* wordmark with the brand's one allowed gradient underline (ReadLark) */}
      <div
        style={{
          fontFamily: FONTS.heading,
          fontWeight: 700,
          fontSize: 150,
          color: brand.chrome.text,
          transform: `scale(${0.9 + pop * 0.1})`,
        }}
      >
        {brand.wordmark}
      </div>
      <div
        style={{
          width: 420,
          height: 16,
          borderRadius: 8,
          marginTop: 6,
          background: grad ?? brand.accent,
        }}
      />
      <div style={{ fontFamily: FONTS.body, fontSize: 48, color: brand.chrome.text, opacity: 0.85, marginTop: 40 }}>
        {brand.domain}
      </div>
      {/* CTA chip */}
      <div
        style={{
          marginTop: 70,
          padding: "26px 56px",
          borderRadius: 20,
          background: brand.chrome.chip.bg,
          color: brand.chrome.chip.text,
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: 54,
          opacity: interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {activeCta(brand)}
      </div>
      {brand.disclaimer && (
        <div
          style={{
            position: "absolute",
            bottom: SHORT_SAFE.bottom - 40,
            width: W - 120,
            textAlign: "center",
            fontFamily: FONTS.body,
            fontSize: 34,
            color: brand.chrome.text,
            opacity: 0.7,
          }}
        >
          {brand.disclaimer}
        </div>
      )}
    </AbsoluteFill>
  );
};

/** First ~2s hook line — the on-screen claim/question, with motion. */
const HookOverlay: React.FC<{ hook: string; frame: number; brand: Brand }> = ({ hook, frame, brand }) => (
  <div
    style={{
      position: "absolute",
      top: SHORT_SAFE.top + 10,
      left: 60,
      width: W - 120,
      textAlign: "center",
      fontFamily: FONTS.heading,
      fontWeight: 700,
      fontSize: 100,
      lineHeight: 1.04,
      color: COLORS.ink,
      opacity: interpolate(frame, [0, 10, 58, 70], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      transform: `translateY(${interpolate(frame, [0, 12], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
    }}
  >
    <span
      style={{
        background: hexA(brand.highlight, 0.5),
        padding: "6px 18px",
        borderRadius: 14,
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {hook}
    </span>
  </div>
);

/** Small persistent brand wordmark carried through every body scene — replaces
 *  the long brand outro (Phase 14) so loop/view-duration metrics aren't bled. */
const Watermark: React.FC<{ brand: Brand }> = ({ brand }) => (
  <div
    style={{
      position: "absolute",
      top: 70,
      width: "100%",
      textAlign: "center",
      fontFamily: FONTS.heading,
      fontWeight: 700,
      fontSize: 40,
      letterSpacing: 1,
      color: COLORS.ink,
      opacity: 0.4,
      pointerEvents: "none",
    }}
  >
    {brand.wordmark}
  </div>
);

/** One short scene: a vertical-native scene (1080×1920) + burned captions + a
 *  persistent watermark. The end-card renders brand chrome (~1s) — or, for a
 *  loop short, just the watermark so the replay is seamless (no brand outro). */
const ShortScene: React.FC<{
  scene: RenderProps["script"]["scenes"][number];
  words: RenderProps["manifest"]["scenes"][number]["words"];
  isHook: boolean;
  hook?: string;
  loop?: boolean;
}> = ({ scene, words, isHook, hook, loop }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();

  if (scene.type === "cta")
    return loop ? (
      <AbsoluteFill style={{ backgroundColor: brand.paper }}>
        <Watermark brand={brand} />
      </AbsoluteFill>
    ) : (
      <ShortEndCard brand={brand} />
    );

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper, overflow: "hidden" }}>
      <VerticalScene scene={scene} words={words} isHook={isHook} />
      <Watermark brand={brand} />
      {isHook && hook && <HookOverlay hook={hook} frame={frame} brand={brand} />}
    </AbsoluteFill>
  );
};

// ── Kinetic shorts (no characters) ──────────────────────────────────────────

const WHOOSHES = ["whoosh1", "whoosh2", "whoosh3"];

/** Thin progress bar under the platform header — signals "short, nearly done". */
const ProgressBar: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 150, left: 70, width: W - 160, height: 10, borderRadius: 5, background: "rgba(250,245,235,0.15)" }}>
      <div style={{ width: `${Math.min(100, (frame / Math.max(1, total)) * 100)}%`, height: "100%", borderRadius: 5, background: K.amber }} />
    </div>
  );
};

/** Silent "follow" pill at ~65% of the runtime (research: no spoken outro CTA,
 *  never in the first 5s, never a dead end-card — it would break the loop). */
const FollowPill: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const DUR = 66;
  const f = frame - at;
  if (f < 0 || f > DUR) return null;
  const pop = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  const out = interpolate(f, [DUR - 10, DUR], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 1400, width: W, display: "flex", justifyContent: "center", opacity: out }}>
      <Sfx at={at} name="pop2" volume={0.5} />
      <div style={{ transform: `scale(${pop})`, display: "flex", alignItems: "center", gap: 18, padding: "20px 40px", borderRadius: 60, background: "#E62117", color: "#fff", fontFamily: FONTS.body, fontWeight: 600, fontSize: 46, boxShadow: "0 8px 0 rgba(0,0,0,0.25)" }}>
        <span style={{ fontSize: 50 }}>＋</span> Follow for 1 book a day
      </div>
    </div>
  );
};

/** One kinetic beat: rotating indigo bg + drifting glow, punch-in, flash cut, captions. */
const KineticShortScene: React.FC<{
  scene: Extract<RenderProps["script"]["scenes"][number], { type: "kinetic" }>;
  words: RenderProps["manifest"]["scenes"][number]["words"];
  index: number;
}> = ({ scene, words, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const punch = spring({ frame, fps, config: { damping: 14, stiffness: 200 } });
  const flash = index > 0 ? interpolate(frame, [0, 4], [0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const glowX = 540 + Math.sin((frame + index * 40) / 45) * 220;
  const glowY = 760 + Math.cos((frame + index * 40) / 60) * 160;
  const bg = K.bg[index % K.bg.length]!;
  return (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at ${glowX}px ${glowY}px, rgba(244,96,62,0.22), transparent 55%)` }} />
      {index > 0 && <Sfx at={0} name={WHOOSHES[index % 3]!} volume={0.35} />}
      <AbsoluteFill style={{ transform: `scale(${index > 0 ? 1.1 - punch * 0.1 : 1})` }}>
        <KineticBeat visual={scene.visual} words={words} />
      </AbsoluteFill>
      {!SELF_CAPTIONED.has(scene.visual.layout) && <KineticCaptions words={words} narration={scene.narration} />}
      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash }} />
    </AbsoluteFill>
  );
};

const KineticShort: React.FC<RenderProps> = ({ script, manifest }) => {
  const byId = new Map(script.scenes.map((s) => [s.id, s]));
  const brand = getBrand(script.brand);
  const total = manifest.totalDurationInFrames;
  return (
    <BrandProvider brand={script.brand}>
      <AbsoluteFill style={{ backgroundColor: K.bg[0] }}>
        {manifest.scenes.map((m, i) => {
          const scene = byId.get(m.id);
          if (!scene || scene.type !== "kinetic") return null;
          return (
            <Sequence key={m.id} from={m.startFrame} durationInFrames={m.durationInFrames} name={`${m.id} (${scene.visual.layout})`}>
              <Audio src={staticFile(m.audioFile)} />
              <KineticShortScene scene={scene} words={m.words} index={i} />
            </Sequence>
          );
        })}
        <ProgressBar total={total} />
        <div style={{ position: "absolute", top: 176, width: W, textAlign: "center", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 40, color: K.text, opacity: 0.45 }}>
          {brand.wordmark}
        </div>
        <FollowPill at={Math.round(total * 0.65)} />
      </AbsoluteFill>
    </BrandProvider>
  );
};

/** Vertical shorts composition (1080×1920). One file serves TikTok / Reels / Shorts. */
export const ShortVideo: React.FC<RenderProps> = (props) => {
  if (props.script.scenes.some((s) => s.type === "kinetic")) return <KineticShort {...props} />;
  return <LegacyShort {...props} />;
};

/** Pre-Oct-2026 character shorts (kept so the back catalogue still re-renders). */
const LegacyShort: React.FC<RenderProps> = ({ script, manifest }) => {
  const byId = new Map(script.scenes.map((s) => [s.id, s]));
  return (
    <BrandProvider brand={script.brand}>
      <AbsoluteFill style={{ backgroundColor: getBrand(script.brand).paper }}>
        {manifest.scenes.map((m, i) => {
          const scene = byId.get(m.id);
          if (!scene) return null;
          return (
            <Sequence key={m.id} from={m.startFrame} durationInFrames={m.durationInFrames} name={`${m.id} (${m.type})`}>
              <Audio src={staticFile(m.audioFile)} />
              <ShortScene scene={scene} words={m.words} isHook={i === 0} hook={script.short_hook} loop={script.loop} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </BrandProvider>
  );
};
