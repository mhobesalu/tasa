// Which weekdays a subject has lessons. Learned from homework due dates (an
// e-diary due date is always a lesson day), unless the parent set it by hand.
import { addDays, weekdayIndex, type Day } from "./dates";
import type { AppState } from "./types";

const key = (s: string) => s.trim().toLowerCase();

export function learnedDays(state: AppState, subject: string): number[] {
  const k = key(subject);
  const days = new Set<number>();
  for (const a of state.assignments) {
    if (key(a.subject) !== k || a.kind !== "homework" && a.kind !== "test") continue;
    const w = weekdayIndex(a.due);
    if (w < 5) days.add(w);
  }
  return [...days].sort();
}

export function lessonDays(state: AppState, subject: string): { days: number[]; manual: boolean } {
  const m = state.timetable?.[key(subject)];
  if (m) return { days: [...m].sort(), manual: true };
  return { days: learnedDays(state, subject), manual: false };
}

/** The next lesson after `day`, or null if TASA doesn't know the subject's days yet. */
export function nextLesson(state: AppState, subject: string, day: Day): Day | null {
  const { days } = lessonDays(state, subject);
  if (!days.length) return null;
  for (let i = 1; i <= 14; i++) {
    const d = addDays(day, i);
    if (days.includes(weekdayIndex(d))) return d;
  }
  return null;
}

/** Subjects to show in the timetable grid. */
export function knownSubjects(state: AppState): string[] {
  const seen = new Map<string, string>();
  for (const a of state.assignments) if (!seen.has(key(a.subject))) seen.set(key(a.subject), a.subject);
  for (const k of Object.keys(state.timetable ?? {})) if (!seen.has(k)) seen.set(k, k.charAt(0).toUpperCase() + k.slice(1));
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "et"));
}

export function setDays(state: AppState, subject: string, days: number[]): AppState {
  return { ...state, timetable: { ...(state.timetable ?? {}), [key(subject)]: [...days].sort() } };
}
