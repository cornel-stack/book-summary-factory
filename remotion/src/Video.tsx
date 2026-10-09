import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import type { RenderProps } from "./schema";
import { SceneRenderer } from "./scenes";
import { propShape, type PropKind } from "./drawing/props";
import { fillColor } from "./components/CastFigure";
import { BrandProvider } from "./brand";
import { getBrand } from "../../config/brands";

/** Board memory: small takeaway icons from the current part's principles,
 *  accumulated along the bottom edge (faded, never hand-drawn). */
const BAND_H = 76; // reserved bottom band so icons never overlap seated figures
const BoardMemory: React.FC<{ icons: PropKind[] }> = ({ icons }) => {
  if (!icons.length) return null;
  const size = 52;
  const gap = 22;
  const bandTop = 1080 - BAND_H;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <rect x={0} y={bandTop} width={1920} height={BAND_H} fill="#CBA56B" opacity={0.14} />
      <line x1={0} y1={bandTop} x2={1920} y2={bandTop} stroke="#1C1A17" strokeWidth={1.5} opacity={0.12} />
      <g opacity={0.6}>
      {icons.map((k, i) => {
        const s = propShape(k);
        const sc = Math.min(size / s.viewBox.w, size / s.viewBox.h);
        const x = 60 + i * (size + gap);
        const y = bandTop + (BAND_H - s.viewBox.h * sc) / 2;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}>
            {s.fills?.map((f, j) => (
              <path key={`f${j}`} d={f.d} fill={f.color} fillRule="evenodd" opacity={f.opacity ?? 1} />
            ))}
            {s.strokes.map((d, j) => (
              <path key={j} d={d} fill="none" stroke={fillColor("ink")} strokeWidth={5 / sc} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>
        );
      })}
      </g>
    </svg>
  );
};

/**
 * Main composition. Lays out every scene in a <Sequence> sized from the
 * timing manifest (audio-first: durations come from measured narration, never
 * hardcoded). Each sequence carries its own narration <Audio>, so scene N's
 * audio is anchored to scene N's frames — that is the sync guarantee.
 */
export const Video: React.FC<RenderProps> = ({ script, manifest }) => {
  // Index scenes by id so manifest order/timings drive layout, script drives content.
  const byId = new Map(script.scenes.map((s) => [s.id, s]));

  // Board memory: accumulate each principle's takeaway icon through its part,
  // wiped at the next part boundary.
  const memByScene = new Map<string, PropKind[]>();
  let acc: PropKind[] = [];
  for (const s of script.scenes) {
    if (s.type === "section_title") {
      if (s.visual.role === "part") acc = [];
      if (s.visual.role === "principle" && s.visual.memory) acc = [...acc, s.visual.memory as PropKind];
    }
    memByScene.set(s.id, acc);
  }

  const brand = getBrand(script.brand);

  return (
    <BrandProvider brand={script.brand}>
      <AbsoluteFill style={{ backgroundColor: brand.paper }}>
        {manifest.scenes.map((m) => {
          const scene = byId.get(m.id);
          if (!scene) return null;
          return (
            <Sequence
              key={m.id}
              from={m.startFrame}
              durationInFrames={m.durationInFrames}
              name={`${m.id} (${m.type})`}
            >
              <Audio src={staticFile(m.audioFile)} />
              <SceneRenderer scene={scene} words={m.words} />
              <BoardMemory icons={memByScene.get(m.id) ?? []} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </BrandProvider>
  );
};
