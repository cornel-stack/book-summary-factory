/**
 * Step 3 of the audio-first pipeline.
 *
 * Input : .build/<video-id>/manifest.json
 * Output: .build/<video-id>/captions.srt
 *
 * Flattens per-scene word timings into absolute video time and groups them
 * into readable caption lines (~7 words / max 42 chars). Scene boundaries
 * always break a line so captions stay aligned to what's on screen.
 *
 * Usage: tsx pipeline/build_captions.ts <video-id>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Manifest } from "../remotion/src/schema.js";
import { CAPTIONS } from "../remotion/src/theme.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Cue = { start: number; end: number; text: string };

function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

function main() {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error("Usage: tsx pipeline/build_captions.ts <video-id>");
    process.exit(1);
  }

  const manifestPath = join(REPO, ".build", videoId, "manifest.json");
  const manifest = Manifest.parse(JSON.parse(readFileSync(manifestPath, "utf8")));

  const cues: Cue[] = [];
  for (const scene of manifest.scenes) {
    const sceneStart = scene.startFrame / manifest.fps;
    let line: { words: string[]; start: number; end: number } | null = null;

    const flush = () => {
      if (line && line.words.length > 0) {
        cues.push({ start: line.start, end: line.end, text: line.words.join(" ") });
      }
      line = null;
    };

    for (const w of scene.words) {
      const absStart = sceneStart + w.start;
      const absEnd = sceneStart + w.end;
      const word = w.text;

      if (line) {
        const candidate = `${line.words.join(" ")} ${word}`;
        const tooMany = line.words.length >= CAPTIONS.maxWordsPerLine;
        const tooLong = candidate.length > CAPTIONS.maxCharsPerLine;
        if (tooMany || tooLong) flush();
      }

      if (!line) {
        line = { words: [word], start: absStart, end: absEnd };
      } else {
        line.words.push(word);
        line.end = absEnd;
      }
    }
    flush(); // break line at scene boundary
  }

  // Guarantee non-overlapping, strictly increasing cue times.
  const srt = cues
    .map((c, i) => {
      const end = Math.max(c.end, c.start + 0.3);
      return `${i + 1}\n${srtTime(c.start)} --> ${srtTime(end)}\n${c.text}\n`;
    })
    .join("\n");

  const outPath = join(REPO, ".build", videoId, "captions.srt");
  writeFileSync(outPath, srt);
  console.log(`Captions: ${cues.length} cues → ${outPath}`);
}

main();
