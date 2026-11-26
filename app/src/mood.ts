// The student's own end-of-day check-in. It stays on the phone and the parent view never shows the answers.
// It is used to offer a lighter plan and, after many very hard days, to ask the STUDENT whether
// they want the parent to know. Only a "yes" shows the parent one sentence. It never diagnoses anything.
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
  { title: "Lasteabi 116 111", sub: "Tasuta, ööpäev läbi. Saab ka kirjutada", url: "https://www.lasteabi.ee" },
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

/** Looked at for "Kas tahad, et lapsevanem teaks?": the last two weeks. */
export const SHARE_WINDOW = 14;
/** How many "Väga raske" days in those two weeks, at least 2 in each week, before the student is asked. */
export const SHARE_MIN = 5;

/**
 * True when the student picked "Väga raske" today and on many days over the last two weeks
 * (so it isn't one bad week), nothing is shared already, and they weren't asked in the last two weeks.
 */
export function offerShare(s: Pick<AppState, "moods" | "moodAsked" | "moodNote">, day: Day): boolean {
  if (s.moodNote) return false;
  if (s.moods?.[day] !== 4) return false;
  if (s.moodAsked && s.moodAsked > addDays(day, -SHARE_WINDOW)) return false;
  let thisWeek = 0;
  let lastWeek = 0;
  for (let i = 0; i < SHARE_WINDOW; i++) {
    if (s.moods?.[addDays(day, -i)] !== 4) continue;
    if (i < 7) thisWeek++;
    else lastWeek++;
  }
  return thisWeek >= 2 && lastWeek >= 2 && thisWeek + lastWeek >= SHARE_MIN;
}

/** The student's answer. "No" shares nothing; either way they are not asked again for two weeks. */
export function answerShare(s: AppState, day: Day, yes: boolean): AppState {
  return { ...s, moodAsked: day, moodNote: yes ? { day } : undefined };
}

/** The student takes it back, or the parent has read it. */
export function clearShare(s: AppState): AppState {
  const { moodNote, ...rest } = s;
  return rest;
}
