// Dates are plain local calendar days as "YYYY-MM-DD" strings.
// That keeps storage simple and avoids time-zone surprises.

export type Day = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDay(d: Date): Day {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): Day {
  return toDay(new Date());
}

export function parseDay(day: Day): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // noon avoids DST edge cases
}

export function addDays(day: Day, n: number): Day {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: Day, b: Day): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(day: Day): number {
  return (parseDay(day).getDay() + 6) % 7;
}

export function mondayOf(day: Day): Day {
  return addDays(day, -weekdayIndex(day));
}

export const WEEKDAY_SHORT = ["E", "T", "K", "N", "R", "L", "P"];
export const WEEKDAY_NAMES = [
  "esmaspäev",
  "teisipäev",
  "kolmapäev",
  "neljapäev",
  "reede",
  "laupäev",
  "pühapäev",
];
const MONTHS = [
  "jaanuar",
  "veebruar",
  "märts",
  "aprill",
  "mai",
  "juuni",
  "juuli",
  "august",
  "september",
  "oktoober",
  "november",
  "detsember",
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Teisipäev, 3. november" */
export function longDate(day: Day): string {
  const d = parseDay(day);
  return `${cap(WEEKDAY_NAMES[weekdayIndex(day)])}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** "N 5.11" */
export function shortDate(day: Day): string {
  const d = parseDay(day);
  return `${WEEKDAY_SHORT[weekdayIndex(day)]} ${d.getDate()}.${d.getMonth() + 1}`;
}

/** "täna", "homme", or "N 5.11" */
export function relDate(day: Day, ref: Day): string {
  const n = diffDays(ref, day);
  if (n === 0) return "täna";
  if (n === 1) return "homme";
  if (n === -1) return "eile";
  return shortDate(day);
}
