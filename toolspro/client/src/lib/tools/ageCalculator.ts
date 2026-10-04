export type AgeResult =
  | {
      ok: true;
      years: number;
      months: number;
      days: number;
      totalMonths: number;
      totalDays: number;
      daysUntilBirthday: number;
    }
  | { ok: false; error: string };

interface YMD {
  y: number;
  m: number; // 1 se 12
  d: number;
}

const DAY_MS = 86_400_000;

// Local tareekh ko "YYYY-MM-DD" banata hai. toISOString() jaan boojh kar use nahi kiya:
// wo UTC mein badal deta hai aur raat ko tareekh ek din aage/peeche ho sakti hai.
export function toISODate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODate(value: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 1900) return null;
  // Asli tareekh hai ya nahi: 2023-02-30 ban to jati hai, lekin 1 March ban jati hai
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { y, m, d };
}

function utc(p: YMD): number {
  return Date.UTC(p.y, p.m - 1, p.d);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Mahine jorna, lekin mahine ke aakhir se aage nahi: 31 Jan + 1 mahina = 28 Feb
function addMonths(p: YMD, months: number): YMD {
  const index = p.m - 1 + months;
  const y = p.y + Math.floor(index / 12);
  const m = (((index % 12) + 12) % 12) + 1;
  return { y, m, d: Math.min(p.d, daysInMonth(y, m)) };
}

export function calculateAge(birthValue: string, asOfValue: string): AgeResult {
  if (birthValue === "") return { ok: false, error: "Enter a date of birth." };
  if (asOfValue === "") return { ok: false, error: "Enter the date to calculate the age at." };

  const birth = parseISODate(birthValue);
  const asOf = parseISODate(asOfValue);
  if (!birth) return { ok: false, error: "Enter a valid date of birth (year 1900 or later)." };
  if (!asOf) return { ok: false, error: "Enter a valid date for Age at the date of (year 1900 or later)." };
  if (utc(birth) > utc(asOf)) {
    return { ok: false, error: "The date of birth cannot be after the date you are calculating the age at." };
  }

  // Poore mahine: sab se bara n jis ke liye (birth + n mahine) <= asOf
  let totalMonths = (asOf.y - birth.y) * 12 + (asOf.m - birth.m);
  if (utc(addMonths(birth, totalMonths)) > utc(asOf)) totalMonths -= 1;

  const anchor = addMonths(birth, totalMonths);
  const days = Math.round((utc(asOf) - utc(anchor)) / DAY_MS);
  const totalDays = Math.round((utc(asOf) - utc(birth)) / DAY_MS);

  // Agli salgirah. 29 Feb waale ke liye non-leap saal mein 28 Feb
  const target = utc(asOf);
  const birthdayIn = (year: number) => Date.UTC(year, birth.m - 1, Math.min(birth.d, daysInMonth(year, birth.m)));
  const thisYear = birthdayIn(asOf.y);
  const next = thisYear >= target ? thisYear : birthdayIn(asOf.y + 1);

  return {
    ok: true,
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    totalMonths,
    totalDays,
    daysUntilBirthday: Math.round((next - target) / DAY_MS),
  };
}