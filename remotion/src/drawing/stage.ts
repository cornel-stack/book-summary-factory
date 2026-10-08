import { SCENE_PALETTE as P, SCENE_TINT as T, VIDEO } from "../theme";

/**
 * Staging layer (Phase 7). A `stage` is a named, data-driven environment —
 * composed flat-vector SVG in SCENE coordinates (1920×1080) with muted
 * SCENE_PALETTE fills. Stages are AMBIENT: they wash in (soft fade, ~0.4s)
 * rather than being hand-drawn, so a scene feels full instantly without
 * spending pen time. Every stage lays a ground/floor so characters stand ON
 * something. flame is NOT used here — it stays reserved for the hero/emphasis.
 */

export type StageName = "plain" | "outdoor" | "room" | "desk-office" | "street" | "stage-spotlight";

export type StageShape = { d: string; fill?: string; stroke?: string; sw?: number; opacity?: number };

/** Shared horizon: characters placed with feet near the lower third stand on
 *  the floor region that runs from here to the bottom of the frame. */
export const GROUND_Y = 905;
const W = VIDEO.width;
const H = VIDEO.height;
const PAPER = "#FAF6EE";
const INK = "#1C1A17";

const rect = (x: number, y: number, w: number, h: number) => `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
const circ = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
const groundLine: StageShape = { d: `M 0 ${GROUND_Y} L ${W} ${GROUND_Y}`, stroke: INK, sw: 2.5, opacity: 0.28 };

/** A rounded background bush (all one leaf tone), sitting on the ground. */
function tree(x: number, scale: number): StageShape[] {
  const cy = GROUND_Y - 66 * scale;
  return [
    { d: circ(x, cy, 72 * scale), fill: P.leaf, opacity: 0.8 },
    { d: circ(x - 44 * scale, cy + 22 * scale, 46 * scale), fill: P.leaf, opacity: 0.8 },
    { d: circ(x + 44 * scale, cy + 22 * scale, 46 * scale), fill: P.leaf, opacity: 0.8 },
  ];
}

/** A potted plant for interior stages (pot = sand to keep the palette tight). */
function plant(x: number, baseY: number, scale: number): StageShape[] {
  return [
    { d: `M ${x - 26 * scale} ${baseY} L ${x + 26 * scale} ${baseY} L ${x + 20 * scale} ${baseY + 46 * scale} L ${x - 20 * scale} ${baseY + 46 * scale} Z`, fill: P.sand, opacity: 0.95 },
    { d: circ(x, baseY - 36 * scale, 44 * scale), fill: P.leaf, opacity: 0.9 },
    { d: circ(x - 34 * scale, baseY - 14 * scale, 26 * scale), fill: P.leaf, opacity: 0.9 },
    { d: circ(x + 34 * scale, baseY - 14 * scale, 26 * scale), fill: P.leaf, opacity: 0.9 },
  ];
}

/** A window (sky-tinted) with a frame + cross panes, on a back wall. */
function window(x: number, y: number, w: number, h: number): StageShape[] {
  return [
    { d: rect(x, y, w, h), fill: T.sky },
    { d: rect(x, y, w, h), stroke: INK, sw: 4, opacity: 0.6 },
    { d: `M ${x + w / 2} ${y} L ${x + w / 2} ${y + h}`, stroke: INK, sw: 4, opacity: 0.6 },
    { d: `M ${x} ${y + h / 2} L ${x + w} ${y + h / 2}`, stroke: INK, sw: 4, opacity: 0.6 },
  ];
}

export function stageShapes(name: StageName): StageShape[] {
  const floor = (fill: string, op: number): StageShape => ({ d: rect(0, GROUND_Y, W, H - GROUND_Y), fill, opacity: op });
  switch (name) {
    case "plain":
      return [floor(P.sand, 0.14), groundLine];

    case "outdoor":
      // palette: sky + leaf only, so a hero metaphor prop (sand path, sand/sky
      // mountain, coral target) adds the one focal 3rd colour (+ flame).
      return [
        { d: rect(0, 0, W, 640), fill: T.sky, opacity: 0.6 }, // sky
        { d: circ(1600, 165, 54), fill: PAPER }, { d: circ(1670, 155, 66), fill: PAPER }, { d: circ(1740, 165, 48), fill: PAPER }, // cloud R
        { d: circ(320, 150, 42), fill: PAPER }, { d: circ(386, 142, 52), fill: PAPER }, { d: circ(262, 142, 36), fill: PAPER }, // cloud L
        { d: `M -60 ${GROUND_Y} Q 420 660 960 ${GROUND_Y} Z`, fill: P.leaf, opacity: 0.4 }, // hill L
        { d: `M 760 ${GROUND_Y} Q 1360 640 1990 ${GROUND_Y} Z`, fill: P.leaf, opacity: 0.55 }, // hill R
        floor(P.leaf, 0.6), // grass
        groundLine,
        ...tree(180, 1.05),
        ...tree(1760, 0.9),
      ];

    case "room":
      return [
        { d: rect(0, 0, W, GROUND_Y), fill: T.sand, opacity: 0.4 }, // wall
        floor(P.sand, 0.5), // wood floor
        { d: `M 0 ${GROUND_Y} L ${W} ${GROUND_Y}`, stroke: INK, sw: 3, opacity: 0.3 },
        ...window(1360, 150, 380, 360),
        ...plant(170, GROUND_Y - 46, 1.1),
      ];

    case "desk-office":
      return [
        { d: rect(0, 0, W, GROUND_Y), fill: T.sky, opacity: 0.32 }, // cool wall
        floor(P.sand, 0.45),
        { d: `M 0 ${GROUND_Y} L ${W} ${GROUND_Y}`, stroke: INK, sw: 3, opacity: 0.3 },
        ...window(1340, 120, 430, 390),
        { d: circ(300, 230, 64), fill: T.sky }, { d: rect(236, 166, 128, 128), stroke: INK, sw: 4, opacity: 0.5 }, // wall clock in a frame
        { d: `M 300 230 L 300 190`, stroke: INK, sw: 4, opacity: 0.6 }, { d: `M 300 230 L 334 244`, stroke: INK, sw: 4, opacity: 0.6 },
        ...plant(1810, GROUND_Y - 46, 1.0),
      ];

    case "street": {
      const b = (x: number, w: number, top: number, fill: string): StageShape[] => {
        const out: StageShape[] = [{ d: rect(x, top, w, GROUND_Y - top), fill, opacity: 0.55 }];
        for (let wy = top + 40; wy < GROUND_Y - 60; wy += 90)
          for (let wx = x + 24; wx < x + w - 40; wx += 80) out.push({ d: rect(wx, wy, 42, 52), fill: T.sun, opacity: 0.8 });
        return out;
      };
      return [
        { d: rect(0, 0, W, GROUND_Y), fill: T.sky, opacity: 0.4 }, // sky
        ...b(40, 300, 360, P.sand),
        ...b(360, 260, 250, P.sky),
        ...b(640, 220, 430, P.sand),
        ...b(1180, 300, 300, P.sky),
        ...b(1500, 260, 330, P.sand),
        floor(P.sand, 0.6), // road
        groundLine,
        { d: `M 0 ${GROUND_Y + 90} L ${W} ${GROUND_Y + 90}`, stroke: PAPER, sw: 6 }, // road line
      ];
    }

    case "stage-spotlight":
      return [
        { d: rect(0, GROUND_Y, W, H - GROUND_Y), fill: P.sand, opacity: 0.4 }, // stage floor
        { d: `M 820 0 L 1100 0 L 1480 ${GROUND_Y} L 440 ${GROUND_Y} Z`, fill: P.sun, opacity: 0.16 }, // light cone
        { d: `M 960 ${GROUND_Y} m -300 0 a 300 60 0 1 0 600 0 a 300 60 0 1 0 -600 0`, fill: P.sun, opacity: 0.28 }, // light pool
        groundLine,
      ];
  }
}
