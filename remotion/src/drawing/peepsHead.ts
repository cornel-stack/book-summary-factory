import { PEEPS_HAIR, PEEPS_FACE, PEEPS_FACE_OFFSET, type PeepsPath } from "./peeps";

/**
 * Head transplant: compose an Open Peeps head (skin + hair + face) and mount it
 * on OUR rigged body at the neck node, scaled to our head-size rule. Returns
 * render-ready parts (each with its own local translate) plus the mount
 * transform that places the composed head at (cx, chinY) at `headR` scale.
 *
 * Measured in Peeps head-group coords (see PeepsCalib): the head spans
 * ~y[95,520], chin ≈ (445,515), full height ≈ 420.
 */
const PEEPS_CHIN = { x: 442, y: 512 };
const PEEPS_HEAD_H = 420;

export type HeadPart = { d: string; tx: number; ty: number; kind: "skin" | "ink"; evenodd: boolean };

/** Our 7 expressions → the closest Open Peeps face part. */
export const PEEPS_EXPRESSION: Record<string, string> = {
  neutral: "Calm",
  happy: "Smile",
  worried: "Concerned",
  shocked: "Awe",
  angry: "Angry",
  tired: "Tired",
  curious: "Suspicious",
};

/** Per-character Open Peeps hair choice (closest to the established silhouette). */
export const PEEPS_HAIR_FOR: Record<string, string> = {
  max: "Short", // short cap — matches Max's established short hair
  maya: "Bun", // tied-back (Peeps has no true ponytail — closest equivalent)
  alex: "Short",
  sage: "Bald",
  pip: "Short",
};

export function peepsHeadParts(hairName: string, faceName: string): HeadPart[] {
  const hair: PeepsPath[] = PEEPS_HAIR[hairName] ?? PEEPS_HAIR.Short!;
  const face: PeepsPath[] = PEEPS_FACE[faceName] ?? PEEPS_FACE.Calm!;
  const out: HeadPart[] = [];
  // skin first (so hair + face draw on top), in hair draw order
  for (const p of hair.filter((p) => p.role === "skin")) out.push({ d: p.d, tx: p.tx, ty: p.ty, kind: "skin", evenodd: p.evenodd });
  for (const p of hair.filter((p) => p.role === "ink")) out.push({ d: p.d, tx: p.tx, ty: p.ty, kind: "ink", evenodd: p.evenodd });
  for (const p of face) out.push({ d: p.d, tx: PEEPS_FACE_OFFSET.x + p.tx, ty: PEEPS_FACE_OFFSET.y + p.ty, kind: "ink", evenodd: p.evenodd });
  return out;
}

/** Open Peeps heads ship with a built-in ~10° lean; counter-rotate about the
 *  chin so the head sits upright on our vertical rig. */
const DETILT = 10;

/** Transform that mounts the composed head at (cx, chinY) with our head size.
 *  `headR` is our head radius; the Peeps head is matched to ~2.3·headR tall. */
export function peepsHeadMount(cx: number, chinY: number, headR: number): string {
  const s = (headR * 2.3) / PEEPS_HEAD_H;
  return `translate(${cx} ${chinY}) scale(${s}) translate(${-PEEPS_CHIN.x} ${-PEEPS_CHIN.y}) rotate(${DETILT} ${PEEPS_CHIN.x} ${PEEPS_CHIN.y})`;
}
