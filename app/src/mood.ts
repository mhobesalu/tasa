// The student's own end-of-day check-in. It stays on the phone, the parent view never shows it,
// and it is only used to offer a lighter plan. It never diagnoses anything.
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
