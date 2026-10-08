/**
 * Fill the content calendar with WEEKDAY publish dates — one command to queue a
 * month. Assigns consecutive Mon–Fri dates (Sat/Sun skipped) to a list of video
 * ids, starting at --start, and upserts them into content/calendar.json.
 *
 * Existing "rendered"/"published" entries are never clobbered. An id already in
 * the calendar is re-dated (kept "scheduled"); new ids are appended.
 *
 *   npm run calendar:fill -- --start 2026-10-12 --ids atomic-habits,deep-work,ego-is-the-enemy
 *
 * The cadence is one video per weekday (~20/month); the scheduler renders each
 * entry the morning of its publish_date (see .github/workflows/scheduled-render.yml).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CAL = join(REPO, "content", "calendar.json");

type Entry = { video_id: string; publish_date: string; status: "scheduled" | "rendered" | "published" };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const DAY_MS = 86_400_000;
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;
const fmt = (d: Date) => d.toISOString().slice(0, 10);

function main() {
  const start = arg("start");
  const idsRaw = arg("ids");
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !idsRaw) {
    console.error("Usage: npm run calendar:fill -- --start YYYY-MM-DD --ids id1,id2,...");
    process.exit(1);
  }
  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    console.error("✖ --ids is empty");
    process.exit(1);
  }

  const cal: Entry[] = existsSync(CAL) ? JSON.parse(readFileSync(CAL, "utf8")) : [];
  const byId = new Map(cal.map((e) => [e.video_id, e]));
  const takenDates = new Map(cal.map((e) => [e.publish_date, e.video_id]));

  // Walk weekdays from --start, assigning one per id.
  let cursor = new Date(`${start}T00:00:00Z`);
  while (isWeekend(cursor)) cursor = new Date(cursor.getTime() + DAY_MS);

  for (const id of ids) {
    const date = fmt(cursor);
    const clash = takenDates.get(date);
    if (clash && clash !== id) {
      console.warn(`⚠ ${date} already holds "${clash}" — "${id}" will share that date; fix manually if unintended`);
    }
    const existing = byId.get(id);
    if (existing && (existing.status === "rendered" || existing.status === "published")) {
      console.warn(`⚠ "${id}" is already ${existing.status} (${existing.publish_date}) — leaving it untouched`);
    } else if (existing) {
      takenDates.delete(existing.publish_date); // vacate the old slot before re-dating
      existing.publish_date = date;
      existing.status = "scheduled";
      takenDates.set(date, id);
      console.log(`  re-dated  ${id.padEnd(24)} → ${date}`);
    } else {
      const e: Entry = { video_id: id, publish_date: date, status: "scheduled" };
      cal.push(e);
      byId.set(id, e);
      takenDates.set(date, id);
      console.log(`  queued    ${id.padEnd(24)} → ${date}`);
    }
    // advance to the next weekday
    do {
      cursor = new Date(cursor.getTime() + DAY_MS);
    } while (isWeekend(cursor));
  }

  cal.sort((a, b) => a.publish_date.localeCompare(b.publish_date) || a.video_id.localeCompare(b.video_id));
  writeFileSync(CAL, JSON.stringify(cal, null, 2) + "\n");
  console.log(`\n✓ wrote ${cal.length} entries → content/calendar.json`);
}

main();
