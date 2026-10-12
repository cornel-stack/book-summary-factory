/**
 * Webfonts for the whiteboard style. Caveat (handwritten) for headings and
 * on-screen labels, Inter (clean sans) for body text where needed.
 * @remotion/google-fonts handles the delayRender/wait-for-load automatically.
 */
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";

const caveat = loadCaveat("normal", { weights: ["400", "700"] });
const inter = loadInter("normal", { weights: ["400", "600"] });
// Anton: a heavy condensed display face for high-contrast thumbnail punch words.
const anton = loadAnton("normal", { weights: ["400"] });

export const FONT_FAMILY = {
  hand: caveat.fontFamily, // headings, labels, hand-written numbers
  body: inter.fontFamily, // quote body, longer text
  display: anton.fontFamily, // bold thumbnail punch headline
} as const;
