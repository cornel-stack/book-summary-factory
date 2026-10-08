/**
 * Narration sync: resolve a short phrase to the time (seconds) the narrator
 * first starts saying it, using edge-tts per-word timestamps. Shared by the
 * pipeline (build-time validation) and the composition (actual timing) so the
 * matching logic can never drift between them.
 */
export type Word = { text: string; start: number; end: number };

const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * Returns the start time (seconds, relative to the scene audio) of the first
 * word of `phrase`, or null if the phrase doesn't appear in the words.
 */
export function resolvePhraseTime(words: Word[], phrase: string): number | null {
  const target = tokenize(phrase);
  if (target.length === 0) return null;

  // Flatten words into normalized tokens, each keeping its source word's start.
  const flat: { tok: string; start: number }[] = [];
  for (const w of words) {
    for (const tok of tokenize(w.text)) flat.push({ tok, start: w.start });
  }

  for (let i = 0; i + target.length <= flat.length; i++) {
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (flat[i + j]!.tok !== target[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return flat[i]!.start;
  }
  return null;
}
