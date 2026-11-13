import type { AppState } from "./types";

const key = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Remove what a screenshot read adds around a subject name: the e-diary's
 * icons come out as "O", "|" or a lone ")". "OMuusikaajalugu |" -> "Muusikaajalugu".
 */
export function cleanSubject(raw: string): string {
  let s = raw.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s
      .replace(/^[|•·©®°*~_\-–—>»"'`.,;:]+\s*/, "")
      .replace(/\s*[|•·©®°*~_>»"'`,;:]+$/, "")
      .replace(/^[O0o]\s?(?=[A-ZÕÄÖÜŠŽ][a-zõäöüšž])/, "") // icon read as "O" before the name
      .replace(/\s+[O0o]$/, "") // icon read as "O" after the name
      .trim();
    // ")" with no "(" before it
    if (/\)$/.test(s) && !s.includes("(")) s = s.replace(/\s*\)+$/, "").trim();
    if (s === before) break;
  }
  return s;
}

/** A name with no letters (e.g. "14" from the screenshot clock) is not a subject. */
export const isSubjectName = (s: string) =>
  /\p{L}{2}/u.test(s) &&
  /^\p{Lu}/u.test(s) && // e-diary subject names start with a capital letter
  !/\d[.,]\d/.test(s); // "V3.0,25": a version or decimal number, not a subject

/** Use the spelling already in the plan when the cleaned name matches one. */
export function matchSubject(raw: string, state: AppState): string {
  const s = cleanSubject(raw) || raw.trim();
  const k = key(s);
  const hit = state.assignments.find((a) => key(a.subject) === k);
  return hit ? hit.subject : s;
}

/** Rename a subject everywhere, or merge it into another one when the new name already exists. */
export function renameSubject(state: AppState, from: string, to: string): AppState {
  const f = key(from);
  const name = to.replace(/\s+/g, " ").trim();
  if (!name || key(name) === f && name === from) return state;
  const target = state.assignments.find((a) => key(a.subject) === key(name) && key(a.subject) !== f)?.subject ?? name;
  const tt = { ...(state.timetable ?? {}) };
  if (tt[f] && !tt[key(target)]) tt[key(target)] = tt[f];
  if (key(target) !== f) delete tt[f];
  const seen = new Set<string>();
  const pending = (state.pendingRetakes ?? [])
    .map((r) => (key(r.subject) === f ? { ...r, subject: target } : r))
    .filter((r) => (seen.has(key(r.subject)) ? false : (seen.add(key(r.subject)), true)));
  return {
    ...state,
    assignments: state.assignments.map((a) => (key(a.subject) === f ? { ...a, subject: target } : a)),
    pendingRetakes: pending,
    timetable: tt,
  };
}

/** Run once on load: tidy names saved before the cleanup existed and merge the duplicates it reveals. */
export function tidySubjects(state: AppState): AppState {
  let s = state;
  const names = [...new Set([...s.assignments.map((a) => a.subject), ...(s.pendingRetakes ?? []).map((r) => r.subject)])];
  for (const n of names) {
    const c = cleanSubject(n);
    if (c && c !== n && isSubjectName(c)) s = renameSubject(s, n, c);
  }
  return s;
}
