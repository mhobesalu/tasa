// Read lesson days from a timetable screenshot. Schools' timetables all look
// different, so this only relies on weekday headings: a row of day columns
// (a grid) or day headings with lessons below them (a list). The parent checks
// the result before anything is saved.
import { cleanSubject } from "./subjects";

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

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function near(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length] <= max;
}

/** 0–4 when the text is a weekday heading ("E", "E 16.11", "Esmaspäev, 16. november", misread "Esmaspääev"), else -1. */
export function weekdayOf(text: string): number {
  const t = text.trim();
  if (t.length > 30) return -1;
  const first = fold(t).split(/[\s,.]+/)[0] ?? "";
  for (let i = 0; i < 5; i++) {
    const w = fold(DAY_WORDS[i]);
    if (first === w || (first.length >= 6 && near(first, w, 2))) return i;
    if (first === w.slice(0, 3) && /^\p{L}{3}\./u.test(t)) return i; // "Esm. 16.11"
  }
  const m = t.match(/^([ETKNR])(?:\s+\d{1,2}\.\s?\d{1,2}\.?)?$/);
  return m ? LETTERS.indexOf(m[1]) : -1;
}

/** Common school subjects, so teacher names, rooms and the canteen are left out. */
const SUBJECTS = [
  "matemaatika", "eesti keel", "kirjandus", "inglise keel", "vene keel", "saksa keel", "prantsuse keel", "soome keel",
  "hispaania keel", "a-keel", "b-keel", "c-keel", "füüsika", "keemia", "bioloogia", "geograafia", "loodusõpetus",
  "ajalugu", "ühiskonnaõpetus", "inimeseõpetus", "kehaline kasvatus", "muusika", "muusikaajalugu", "kunst",
  "kunstiajalugu", "käsitöö", "tööõpetus", "tehnoloogia", "informaatika", "arvutiõpetus", "programmeerimine",
  "robootika", "laulmine", "koor", "kammerkoor", "riigikaitse", "usundiõpetus", "religiooniõpetus",
  "kristliku maailmapildi alused", "kristliku maailmapildi", "filosoofia", "psühholoogia", "majandus", "ettevõtlus", "eriala", "draama",
  "teater", "filmiõpetus", "meedia", "kjt", "klassijuhataja tund", "klassijuhatajatund", "uurimistöö", "loovtöö",
  "karjääriõpetus", "pärimus", "solfedžo", "rütmika", "tantsuline liikumine", "tants",
];

/** The subject part of a timetable cell line, or null when the line is not a subject. */
export function subjectIn(text: string, known: string[]): string | null {
  const l = fold(text).replace(/\s+/g, " ").trim();
  for (const k of known) {
    const f = fold(k);
    if (l === f || l.startsWith(f + " ")) return k;
  }
  let best = "";
  for (const sname of SUBJECTS) {
    const f = fold(sname);
    if ((l === f || l.startsWith(f + " ")) && f.length > best.length) best = f;
  }
  if (!best) return null;
  // keep a group number that belongs to the name ("Eesti keel 1", "Mat 1")
  const rest = l.slice(best.length).trim().match(/^(\d|i{1,3})\b/);
  const raw = text.trim().slice(0, best.length + (rest ? rest[0].length + 1 : 0)).trim();
  if (best === fold("kristliku maailmapildi")) return "Kristliku maailmapildi alused"; // name split over two lines
  return tidyCase(raw);
}

/** "FÜÜSIKA" → "Füüsika", "FÜÜsiKA" → "Füüsika"; "KJT" stays. */
export function tidyCase(s: string): string {
  const letters = s.replace(/[^\p{L}]/gu, "");
  const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
  if (letters.length <= 3 || upper < letters.length / 2) return s;
  const low = s.toLowerCase();
  return low.charAt(0).toUpperCase() + low.slice(1);
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
  if (short.length === 1) return short[0];
  // "Kirjandus" in the timetable, "Pärimus ja kirjandus" in the e-diary
  const words = known.filter((x) => new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`).test(key(x)));
  return words.length === 1 ? words[0] : null;
}

/** Group pieces into weekday → lesson names, for a grid or a list. */
export function readTimetable(pieces: Piece[], known: string[]): FoundSubject[] {
  const days = new Map<string, { days: Set<number>; known: boolean }>();
  const add = (raw: string, d: number) => {
    const ln = lessonName(raw);
    const n = (ln.length >= 3 ? matchKnown(ln, known) : null) ?? subjectIn(ln, known) ?? subjectIn(raw, known);
    if (!n || weekdayOf(n) >= 0) return;
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
