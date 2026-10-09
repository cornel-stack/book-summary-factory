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
import { SceneRenderer } from "./scenes";
import { COLORS, FONTS, SHORT_SAFE, VIDEO_VERTICAL } from "./theme";
import { BrandProvider, useBrand } from "./brand";
import { getBrand, activeCta, type Brand } from "../../config/brands";
import { BurnedCaptions } from "./components/BurnedCaptions";
import type { ManifestScene } from "./schema";

const W = VIDEO_VERTICAL.width;
const H = VIDEO_VERTICAL.height;
const STAGE_W = 1920;
const STAGE_H = 1080;
const ZOOM = 1.52; // scale the 16:9 stage up so characters read big in 9:16

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

/** One short scene: the 16:9 scene zoomed into the safe zone + burned captions. */
const ShortScene: React.FC<{
  scene: RenderProps["script"]["scenes"][number];
  m: ManifestScene;
  isHook: boolean;
  hook?: string;
}> = ({ scene, m, isHook, hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();

  // End-card scenes render full-frame brand chrome.
  if (scene.type === "cta") return <ShortEndCard brand={brand} />;

  const s = (W / STAGE_W) * ZOOM; // stage scale
  const stageLeft = (W - STAGE_W * s) / 2;
  // place the stage's vertical center in the upper-middle of the content zone
  const centerY = SHORT_SAFE.top + (H - SHORT_SAFE.top - SHORT_SAFE.bottom) * 0.42;
  const stageTop = centerY - (STAGE_H * s) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.paper, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: stageLeft,
          top: stageTop,
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${s})`,
          transformOrigin: "top left",
        }}
      >
        <SceneRenderer scene={scene} words={m.words} />
      </div>

      {/* Hook overlay — first ~2s: the claim/question on screen, with motion. */}
      {isHook && hook && (
        <div
          style={{
            position: "absolute",
            top: SHORT_SAFE.top + 20,
            left: 60,
            width: W - 120,
            textAlign: "center",
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: 92,
            lineHeight: 1.04,
            color: COLORS.ink,
            opacity: interpolate(frame, [0, 10, 55, 68], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [0, 12], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          <span style={{ background: hexA(brand.highlight, 0.5), padding: "6px 16px", borderRadius: 14, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
            {hook}
          </span>
        </div>
      )}

      <BurnedCaptions words={m.words} frame={frame} fps={fps} bottom={H - SHORT_SAFE.bottom} width={W} />
    </AbsoluteFill>
  );
};

function hexA(hex: string, a: number) {
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return `${hex}${aa}`;
}

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
              <ShortScene scene={scene} m={m} isHook={i === 0} hook={script.short_hook} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </BrandProvider>
  );
};
