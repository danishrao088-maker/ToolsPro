import { plural } from "../format";

export interface HoursInput {
  start: string; // "HH:MM"
  end: string;
  breakMinutes: string;
  endsNextDay: boolean;
}

export type HoursResult =
  | { ok: true; netMinutes: number; decimalHours: string; label: string }
  | { ok: false; error: string };

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;
const MINUTES_PER_DAY = 24 * 60;
export const MAX_BREAK_MINUTES = MINUTES_PER_DAY;

// "09:30" -> 570 (din ke shuru se kitne minute). Galat format par null.
export function parseTime(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
}

export function calculateHours(input: HoursInput): HoursResult {
  const start = parseTime(input.start);
  const end = parseTime(input.end);
  if (start === null) return { ok: false, error: "Enter a start time." };
  if (end === null) return { ok: false, error: "Enter an end time." };

  let breakMinutes = 0;
  const breakText = input.breakMinutes.trim();
  if (breakText !== "") {
    if (!/^\d+$/.test(breakText) || Number(breakText) > MAX_BREAK_MINUTES) {
      return { ok: false, error: `The break must be a whole number of minutes from 0 to ${MAX_BREAK_MINUTES}.` };
    }
    breakMinutes = Number(breakText);
  }

  // Sara hisab poore minutes (integers) mein. Decimal sirf aakhir mein dikhane ke liye.
  let shift = end - start;
  if (input.endsNextDay) {
    shift += MINUTES_PER_DAY;
  } else if (shift < 0) {
    return { ok: false, error: "The end time is before the start time. If the shift ends the next day, tick the box below." };
  }
  if (shift > MINUTES_PER_DAY) {
    return { ok: false, error: "A shift can be at most 24 hours. Check the times and the next day box." };
  }

  const netMinutes = shift - breakMinutes;
  if (netMinutes < 0) return { ok: false, error: "The break is longer than the shift." };

  return {
    ok: true,
    netMinutes,
    decimalHours: (netMinutes / 60).toFixed(2),
    label: formatDuration(netMinutes),
  };
}