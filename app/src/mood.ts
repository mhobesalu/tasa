// The student's own end-of-day check-in. It stays on the phone, the parent view never shows it,
// and it is only used to offer a lighter plan. It never diagnoses anything.
// After weeks of "väga raske" the app asks the STUDENT whether the parent may know. Only a yes
// shows the parent one sentence ("the last weeks have been hard"); the answers themselves stay private.
import { addDays, type Day } from "./dates";
import type { AppState, Mood } from "./types";

export const MOODS: { m: Mood; face: string; label: string }[] = [
  { m: 1, face: "😊", label: "Hästi" },
  { m: 2, face: "🙂", label: "Okei" },
  { m: 3, face: "😕", label: "Raske" },
  { m: 4, face: "😣", label: "Väga raske" },
];

export const HELP_LINKS = [
  { title: "Peaasjad.ee", sub: "Nõu ja abi, kui on raske", url: "https://peaasjad.ee" },
  { title: "How We Feel", sub: "Tasuta rakendus tunnete märkamiseks", url: "https://howwefeel.org" },
];

/** True when two of the last three days (today included) felt heavy and tomorrow is not lighter yet. */
export function offerLighter(s: Pick<AppState, "moods" | "lighter">, day: Day): boolean {
  const tomorrow = addDays(day, 1);
  if (s.lighter?.includes(tomorrow)) return false;
  let heavy = 0;
  for (let i = 0; i < 3; i++) if ((s.moods?.[addDays(day, -i)] ?? 0) >= 3) heavy++;
  return heavy >= 2;
}

export function setMood(s: AppState, day: Day, m: Mood | null): AppState {
  const moods = { ...(s.moods ?? {}) };
  if (m) moods[day] = m;
  else delete moods[day];
  // keep about two months, nothing more is needed
  for (const d of Object.keys(moods)) if (d < addDays(day, -60)) delete moods[d];
  return { ...s, moods };
}

export function makeLighter(s: AppState, d: Day): AppState {
  const lighter = [...new Set([...(s.lighter ?? []), d])].filter((x) => x >= addDays(d, -14)).sort();
  return { ...s, lighter };
}

/** "Väga raske" on at least this many days in each of the last two weeks (today included). */
export const HARD_WEEK_DAYS = 3;
/** After the student answered, don't ask again for this many days. */
export const ASK_AGAIN_AFTER = 14;

export function hardWeeks(s: Pick<AppState, "moods">, day: Day): boolean {
  let thisWeek = 0;
  let lastWeek = 0;
  for (let i = 0; i < 14; i++) {
    if (s.moods?.[addDays(day, -i)] !== 4) continue;
    if (i < 7) thisWeek++;
    else lastWeek++;
  }
  return thisWeek >= HARD_WEEK_DAYS && lastWeek >= HARD_WEEK_DAYS;
}

/** Ask today? Only right after the student marks today "väga raske", and not again soon after an answer. */
export function askToShare(s: Pick<AppState, "moods" | "moodShare">, day: Day): boolean {
  if (s.moods?.[day] !== 4 || !hardWeeks(s, day)) return false;
  const a = s.moodShare?.asked;
  return !a || a <= addDays(day, -ASK_AGAIN_AFTER);
}

export function answerShare(s: AppState, day: Day, yes: boolean): AppState {
  return { ...s, moodShare: { asked: day, yes } };
}

/** The student takes the yes back (only while the parent hasn't seen it). */
export function withdrawShare(s: AppState): AppState {
  if (!s.moodShare || s.moodShare.seen) return s;
  return { ...s, moodShare: { ...s.moodShare, yes: false } };
}

/** The note the parent sees, or null. */
export function parentNote(s: Pick<AppState, "moodShare">): { since: Day } | null {
  const m = s.moodShare;
  return m?.yes && !m.seen ? { since: m.asked } : null;
}

export function markShareSeen(s: AppState, day: Day): AppState {
  if (!s.moodShare?.yes) return s;
  return { ...s, moodShare: { ...s.moodShare, seen: day } };
}
