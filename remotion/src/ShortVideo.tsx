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

const W = VIDEO_VERTICAL.width;
const H = VIDEO_VERTICAL.height;

function hexA(hex: string, a: number) {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return `${hex}${aa}`;
}

/** The brand end-card: wordmark + domain + CTA chip (+ disclaimer for PerCuriam). */
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

/** One short scene: a vertical-native scene (1080×1920) + burned captions. The
 *  end-card scenes render full-frame brand chrome instead. */
const ShortScene: React.FC<{
  scene: RenderProps["script"]["scenes"][number];
  words: RenderProps["manifest"]["scenes"][number]["words"];
  isHook: boolean;
  hook?: string;
}> = ({ scene, words, isHook, hook }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();

  if (scene.type === "cta") return <ShortEndCard brand={brand} />;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper, overflow: "hidden" }}>
      <VerticalScene scene={scene} words={words} isHook={isHook} />
      {isHook && hook && <HookOverlay hook={hook} frame={frame} brand={brand} />}
    </AbsoluteFill>
  );
};

/** Vertical shorts composition (1080×1920). One file serves TikTok / Reels / Shorts. */
export const ShortVideo: React.FC<RenderProps> = ({ script, manifest }) => {
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
              <ShortScene scene={scene} words={m.words} isHook={i === 0} hook={script.short_hook} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </BrandProvider>
  );
};
