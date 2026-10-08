import raw from "../../public/hand/hand.json";

/** Photographed-hand assets described by /remotion/public/hand/hand.json. */
export type HandImage = {
  id: string;
  src: string; // staticFile path relative to public/
  width: number;
  height: number;
  penTip: { x: number; y: number }; // px in the trimmed image
  renderHeight: number; // on-screen px height for this image
  shaftAngleDeg: number; // natural pen direction in the image
};

export const HAND_IMAGES: HandImage[] = (raw as { images: HandImage[] }).images ?? [];

/** True when photographed hands are available (otherwise use the vector fallback). */
export const HAS_PHOTO_HAND = HAND_IMAGES.length > 0;
