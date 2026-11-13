// Read lesson days from a timetable screenshot. Schools' timetables all look
// different, so this only relies on weekday headings: a row of day columns
// (a grid) or day headings with lessons below them (a list). The parent checks
// the result before anything is saved.
import { cleanSubject, isSubjectName } from "./subjects";

/** One piece of text the phone read, with its place on the picture. */
export interface Piece {
  text: string;
  x: number; // centre
  y: number; // centre
  shot: number; // which screenshot
}

export interface FoundSubject {
  name: string; // as in TASA when it matches a subject there, else as read
  days: number[]; // 0 = Monday
  known: boolean;
}

const DAY_WORDS = ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"];
const LETTERS = ["E", "T", "K", "N", "R"];

/** 0–4 when the text is a weekday heading ("E", "E 16.11", "Esmaspäev, 16. november"), else -1. */
export function weekdayOf(text: string): number {
  const t = text.trim();
  const l = t.toLowerCase();
  for (let i = 0; i < 5; i++) {
    if (l.startsWith(DAY_WORDS[i]) && t.length <= 30) return i;
    if (l.startsWith(DAY_WORDS[i].slice(0, 3) + ".") && t.length <= 16) return i; // "Esm. 16.11"
  }
  const m = t.match(/^([ETKNR])(?:\s+\d{1,2}\.\s?\d{1,2}\.?)?$/);
  return m ? LETTERS.indexOf(m[1]) : -1;
}

const key = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Lesson text without the lesson number, time, room or teacher. */
export function lessonName(text: string): string {
  let s = text
    .replace(/\b\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}\b/g, " ") // 08:15–09:00
    .replace(/\b\d{1,2}[:.]\d{2}\b/g, " ")
    .replace(/^\s*\d{1,2}\s*[.)]?\s+/, "") // "1. ", "1) "
    .replace(/\b(ruum|klass|kab\.?|r\.)\s*\S+/gi, " ")
    .replace(/\s+\d{2,4}[a-z]?$/i, "") // trailing room number "205", "112a"
    .replace(/\s+\p{Lu}\.\s?\p{Lu}[\p{Ll}-]+$/u, "") // teacher "M. Tamm"
    .replace(/\s+/g, " ")
    .trim();
  s = cleanSubject(s);
  return s;
}

/** The subject in TASA that a timetable name means: same name, or one is a short form of the other ("Mat" / "Matemaatika"). */
export function matchKnown(name: string, known: string[]): string | null {
  const k = key(name);
  const exact = known.find((x) => key(x) === k);
  if (exact) return exact;
  const short = known.filter((x) => {
    const kx = key(x);
    const [a, b] = kx.length < k.length ? [kx, k] : [k, kx];
    return a.length >= 3 && b.startsWith(a);
  });
  return short.length === 1 ? short[0] : null;
}

/** Group pieces into weekday → lesson names, for a grid or a list. */
export function readTimetable(pieces: Piece[], known: string[]): FoundSubject[] {
  const days = new Map<string, { days: Set<number>; known: boolean }>();
  const add = (raw: string, d: number) => {
    const n = lessonName(raw);
    if (!n || n.length < 2 || !isSubjectName(n) || weekdayOf(n) >= 0) return;
    const hit = matchKnown(n, known);
    const name = hit ?? n;
    const e = days.get(name) ?? { days: new Set<number>(), known: !!hit };
    e.days.add(d);
    days.set(name, e);
  };

  const shots = [...new Set(pieces.map((p) => p.shot))].sort((a, b) => a - b);
  let carry = -1; // a list can go on in the next screenshot
  for (const s of shots) {
    const ps = pieces.filter((p) => p.shot === s);
    const heads = ps.map((p) => ({ p, d: weekdayOf(p.text) })).filter((h) => h.d >= 0);
    // a grid: three or more different day headings on about the same row
    const rowY = heads.length ? median(heads.map((h) => h.p.y)) : 0;
    const row = heads.filter((h) => Math.abs(h.p.y - rowY) < 40);
    if (new Set(row.map((h) => h.d)).size >= 3) {
      const cols = [...row].sort((a, b) => a.p.x - b.p.x);
      for (const p of ps) {
        if (weekdayOf(p.text) >= 0 || p.y <= rowY + 10) continue;
        let best = cols[0];
        for (const c of cols) if (Math.abs(c.p.x - p.x) < Math.abs(best.p.x - p.x)) best = c;
        add(p.text, best.d);
      }
      carry = -1;
      continue;
    }
    // a list: each lesson belongs to the day heading above it
    let cur = carry;
    for (const p of [...ps].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const d = weekdayOf(p.text);
      if (d >= 0) cur = d;
      else if (cur >= 0) add(p.text, cur);
    }
    carry = cur;
  }
  return [...days.entries()]
    .map(([name, e]) => ({ name, days: [...e.days].sort(), known: e.known }))
    .sort((a, b) => Number(b.known) - Number(a.known) || a.name.localeCompare(b.name, "et"));
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}
