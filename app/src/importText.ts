// Paste import: the parent copies the homework list from the e-diary
// (Stuudium "Ülesanded, kodutööd ja kontrolltööd", or a similar eKool list)
// and pastes it here. Everything is read on the phone; nothing is sent anywhere.
// TASA only copies what the school wrote. It never makes up or solves tasks.

import { addDays, diffDays, toDay, weekdayIndex, type Day } from "./dates";
import type { Assignment, Kind } from "./types";

export interface Draft {
  key: string;
  kind: Kind;
  subject: string;
  title: string;
  due: Day;
  minutes: number;
  note: string;
}

const MONTHS = [
  "jaanuar", "veebruar", "märts", "aprill", "mai", "juuni",
  "juuli", "august", "september", "oktoober", "november", "detsember",
];
const WEEKDAYS = ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev", "pühapäev"];

const STEP_MIN = 25;
const TEST_MIN = 50;
const TITLE_MAX = 90;
const REMINDER_MIN = 5;
// Stuudium ends each task with its age in days, e.g. "… -5p" (seen in the phone browser copy).
const END_MARK = /\s*-\d+p$/;
// A teacher's note that is only "bring X to class" is a reminder, not a 25-min step.
const BRING = /(võta|too|võtke|tooge)\b[^.]{0,60}\bkaasa\b/i;
// Attached Tera material: "Tera: Kordamine KT 1https://…".
const TERA = /^tera:\s/i;

// Lines where the list ends (Stuudium shows these under the list).
const STOP = [
  /^tulevikus veel/i,
  /^lisa endale ülesanne/i,
  /^pärast kl/i,
  /^sinu privaatne märkmik/i,
  /^tegemata$/i,
  /^õppematerjalid$/i,
];
// Lines to ignore wherever they are.
const NOISE = [/^näita vanemaid/i, /^kalender$/i, /^ülesanded, kodutööd/i, /^märgi tehtuks/i, /^töö peitmiseks/i];

const URL = /^https?:\/\/\S+$/i;

function decode(s: string): string {
  return s
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/ /g, " ");
}

/** Pick the year that puts day.month closest to today (school lists span a few weeks). */
function nearDate(d: number, m: number, t: Day): Day | null {
  const y = Number(t.slice(0, 4));
  let best: Day | null = null;
  for (const yy of [y - 1, y, y + 1]) {
    const dt = new Date(yy, m - 1, d, 12);
    if (dt.getMonth() !== m - 1) continue;
    const day = toDay(dt);
    if (best === null || Math.abs(diffDays(t, day)) < Math.abs(diffDays(t, best))) best = day;
  }
  return best;
}

/**
 * A day header, e.g. "K 11. novemberhomme", "N 12. november", "Kolmapäev, 11.11.2026",
 * "11.11", "K 11.11". Returns the day, or null if the line is not a header.
 */
export function parseDayHeader(line: string, t: Day): Day | null {
  const l = line.trim().toLowerCase().replace(/(täna|homme)$/, "").trim();
  // Optional weekday (letter or full name), then "11. november" or "11.11(.2026)"
  const wd = `(?:(?:[etknrlp]|${WEEKDAYS.join("|")}),?\\s+)?`;
  let m = l.match(new RegExp(`^${wd}(\\d{1,2})\\.\\s*(${MONTHS.join("|")})(?:\\s+(\\d{4}))?$`));
  if (m) {
    const d = Number(m[1]), mo = MONTHS.indexOf(m[2]) + 1;
    return m[3] ? toDay(new Date(Number(m[3]), mo - 1, d, 12)) : nearDate(d, mo, t);
  }
  m = l.match(new RegExp(`^${wd}(\\d{1,2})\\.(\\d{1,2})\\.?(\\d{4})?$`));
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return m[3] ? toDay(new Date(Number(m[3]), mo - 1, d, 12)) : nearDate(d, mo, t);
  }
  if (/^täna$/.test(line.trim().toLowerCase())) return t;
  if (/^homme$/.test(line.trim().toLowerCase())) return addDays(t, 1);
  return null;
}

/** "Praktiline eesti keel I1 h" -> name + 60 min; "Üldajalugu Kontrolltöö" -> test. */
export function parseSubjectLine(line: string): { subject: string; minutes: number | null; test: boolean } {
  let s = line.trim();
  let minutes: number | null = null;
  const dur = s.match(/(\d+)\s*h(?:\s*(\d+)\s*min)?$|(\d+)\s*min$/);
  if (dur) {
    minutes = dur[3] ? Number(dur[3]) : Number(dur[1]) * 60 + (dur[2] ? Number(dur[2]) : 0);
    s = s.slice(0, dur.index).trim();
  }
  let test = false;
  if (/\s(kontrolltöö|kt|tunnikontroll|test)$/i.test(s)) {
    test = true;
    s = s.replace(/\s(kontrolltöö|kt|tunnikontroll|test)$/i, "").trim();
  }
  // "Mat 1: Arvuhulgad. Avaldised. (K)" -> "Mat 1"
  const colon = s.indexOf(":");
  if (colon > 0 && colon < 25) s = s.slice(0, colon).trim();
  return { subject: s.slice(0, 30), minutes, test };
}

function shortTitle(text: string): string {
  const first = text.replace(/^NB!?\s*/i, "").split(/(?<=[.!?])\s/)[0].trim();
  const t = first.length <= TITLE_MAX ? first : first.slice(0, TITLE_MAX - 1).replace(/\s\S*$/, "") + "…";
  return t.replace(/[.!]$/, "");
}

/**
 * Read a pasted e-diary list. Layout (Stuudium): a day header, then for each task
 * a subject line followed by the teacher's text (links attach to that text).
 */
export function parsePasted(raw: string, t: Day): Draft[] {
  const lines = decode(raw)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);

  const out: Draft[] = [];
  let day: Day | null = null;
  let cur: { subject: string; minutes: number | null; test: boolean; text: string[]; extra: string[]; done: boolean } | null = null;
  // Phone-browser copy: each task ends with "-Np", and its text can span several lines.
  const marked = lines.some((l) => END_MARK.test(l));

  const flush = () => {
    if (cur && day) {
      const text = cur.text.join("\n").trim();
      const words = text.split("\n").filter((x) => !URL.test(x)).join(" ").trim();
      const kind: Kind = cur.test ? "test" : "homework";
      const title = kind === "test" ? (words ? shortTitle(words) : "kontrolltöö") : words ? shortTitle(words) : "kodune töö";
      const bring = kind === "homework" && cur.minutes === null && BRING.test(words) && words.length < 200;
      out.push({
        key: `${day}|${cur.subject}|${out.length}`,
        kind,
        subject: cur.subject,
        title,
        due: day,
        minutes: cur.minutes ?? (kind === "test" ? TEST_MIN : bring ? REMINDER_MIN : STEP_MIN),
        note: [text, ...cur.extra].filter(Boolean).join("\n"),
      });
    }
    cur = null;
  };

  for (const line of lines) {
    if (STOP.some((r) => r.test(line))) break;
    if (NOISE.some((r) => r.test(line))) continue;
    const h = parseDayHeader(line, t);
    if (h) {
      flush();
      day = h;
      continue;
    }
    if (!day) continue; // text before the first day header
    if (URL.test(line)) {
      if (cur) cur.text.push(line);
      continue;
    }
    if (marked) {
      if (cur && !cur.done) {
        const end = END_MARK.test(line);
        const body = line.replace(END_MARK, "").trim();
        if (body) (TERA.test(body) ? cur.extra : cur.text).push(body);
        if (end) cur.done = true;
        continue;
      }
    } else if (cur && cur.text.length === 0) {
      cur.text.push(line); // teacher's text for this subject
      continue;
    }
    flush();
    cur = { ...parseSubjectLine(line), text: [], extra: [], done: false };
  }
  flush();
  return out;
}

/** Already in the plan? (same subject, day and title) */
export function isDuplicate(d: Draft, existing: Assignment[]): boolean {
  return existing.some(
    (a) => a.due === d.due && a.subject.toLowerCase() === d.subject.toLowerCase() && a.title.toLowerCase() === d.title.toLowerCase(),
  );
}

// ---- Grades table (Stuudium "Hinded") ----
// Copying the table loses which date each grade belongs to, but each subject
// row still comes with its marks. TASA only uses this to suggest a retake for a
// subject with a failing mark; the parent picks the date and the wrong problems.
// Grades are not stored.

const MARK = /^(?:[1-5][+-]?|AR|MA|A|P|H|T|X|E|K)$/i;
// "AR" (arvestatud) is a pass, so it never suggests a retake.
const FAILING = /^(?:[12][+-]?|MA|X)$/i;
const MONTH_LINE = new RegExp(`^(${MONTHS.join("|")})$`, "i");

export interface RetakeHint {
  subject: string;
  marks: string[]; // the failing marks, e.g. ["2"]
}

// Summary view ("Kokkuvõte"): subject + teacher(s), some link lines, "Kursus",
// then "september — oktoober P P 2 P" with the marks on one line.
const LINK_LINES = /^(hindamisjuhend|ainekaart|kirjandus ja materjalid|eesmärgid ja õpiväljundid|tegevuste kava|kursus|päevik|tera|suhtlus|kokkuvõte|kommentaaridega|salvesta\/prindi|\d{4}\/\d{4})$/i;
// The page intro; the first subject comes right after it.
const INTRO = /^tunni kuupäeva ja teema/i;
const MONTH_MARKS = new RegExp(`^(?:${MONTHS.join("|")})(?:\\s*—\\s*(?:${MONTHS.join("|")}))?((?:\\s+\\S+)*)$`, "i");

/** "Keemia alused Mari Maasikas  Jaan Tamm" -> "Keemia alused" */
function stripTeachers(line: string): string {
  let s = line.split(/\s{2,}/)[0].trim();
  const w = s.split(" ");
  const cap = (x: string) => /^[A-ZÕÄÖÜŠŽ][a-zõäöüšž-]+$/.test(x);
  if (w.length >= 3 && cap(w[w.length - 1]) && cap(w[w.length - 2])) s = w.slice(0, -2).join(" ");
  return s;
}

function parseSummary(lines: string[]): { subject: string; marks: string[] }[] | null {
  if (!lines.some((l) => MONTH_MARKS.test(l.trim()) && /\s/.test(l.trim()))) return null;
  const rows: { subject: string; marks: string[] }[] = [];
  let candidate: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const mm = line.match(MONTH_MARKS);
    if (mm) {
      const marks = (mm[1] ?? "").trim().split(/\s+/).filter((x) => MARK.test(x)).map((x) => x.toUpperCase());
      if (candidate) rows.push({ subject: parseSubjectLine(stripTeachers(candidate)).subject, marks });
      candidate = null;
      continue;
    }
    if (INTRO.test(line)) {
      candidate = null;
      continue;
    }
    if (LINK_LINES.test(line)) continue;
    // The subject is the first line of each block. In the phone copy the teachers
    // follow on their own line, so later lines are ignored.
    if (candidate === null) candidate = line;
  }
  return rows;
}

export function parseGrades(raw: string): RetakeHint[] {
  const lines = decode(raw).split(/\r?\n/);
  const rows: { subject: string; marks: string[] }[] = parseSummary(lines.map((l) => l.replace(/[ \t]+$/, ""))) ?? [];
  let started = rows.length > 0;
  for (const rawLine of started ? [] : lines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (!started && (MONTH_LINE.test(line) || /^\d{1,2}$/.test(line))) continue; // column headers
    if (MARK.test(line)) {
      if (rows.length) rows[rows.length - 1].marks.push(line.toUpperCase());
      continue;
    }
    started = true;
    rows.push({ subject: parseSubjectLine(line).subject, marks: [] });
  }
  const bySubject = new Map<string, string[]>();
  for (const r of rows) {
    const bad = r.marks.filter((m) => FAILING.test(m));
    if (bad.length) bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), ...bad]);
  }
  return [...bySubject].map(([subject, marks]) => ({ subject, marks }));
}

// ---- Messages (Stuudium "Suhtlus" / eKool messages) ----
// TASA suggests one thing to do with a pasted message; the parent confirms.
// It never answers the message or writes anything for the student.

export type MessageAction =
  | { type: "attach"; aid: string; label: string }
  | { type: "event"; day: Day; time: string; title: string }
  | { type: "reminder"; due: Day; subject: string; title: string };

export interface ParsedMessage {
  title: string;
  text: string;
  actions: MessageAction[];
}

const MSG_NOISE = [
  /^sõnumit näevad:/i,
  /^arhiveeri$/i,
  /^märgi lemmikuks$/i,
  /^¶?\s*muuda sõnumit$/i,
  /^sõnumit on näinud/i,
  /^\+$/,
  /^\d+ vastus(t)?$/i,
  /vaata veebis$/i,
  /\d{1,2}\.\s*\p{L}+\.?\s+kell\s+\d{1,2}[:.]\d{2}$/iu, // "Mari Maasikas 8. nov kell 17:00"
];

const SUBJECT_WORDS: [string, RegExp][] = [
  ["Matemaatika", /\bmat(emaatika)?\b|\bmatemaatika/i],
  ["Eesti keel", /eesti keel/i],
  ["Inglise keel", /inglise keel/i],
  ["Ajalugu", /ajalu|ajaloo|vanaaeg|vanaaja|keskaeg|keskaja|üldajalugu/i],
  ["Keemia", /keemia/i],
  ["Füüsika", /füüsika/i],
  ["Bioloogia", /bioloogia/i],
  ["Geograafia", /geograafia/i],
  ["Kirjandus", /kirjandus/i],
  ["Muusika", /muusika/i],
  ["Kunst", /\bkunst/i],
];

function subjectIn(text: string): string | null {
  for (const [name, re] of SUBJECT_WORDS) if (re.test(text)) return name;
  return null;
}

const WD_STEMS = ["esmasp", "teisip", "kolmap", "neljap", "reede", "laup", "pühap"];

/** Next day (from tomorrow on) named in the text, e.g. "neljapäevaseks", "kolmapäeviti". */
function weekdayIn(text: string, t: Day): { day: Day; every: boolean } | null {
  const l = text.toLowerCase();
  for (let i = 0; i < 7; i++) {
    const m = l.match(new RegExp(`${WD_STEMS[i]}\\p{L}*`, "u"));
    if (!m) continue;
    for (let k = 1; k <= 7; k++) {
      const d = addDays(t, k);
      if (weekdayIndex(d) === i) return { day: d, every: /iti$/.test(m[0]) };
    }
  }
  return null;
}

function dateIn(text: string, t: Day): Day | null {
  const m = text.match(/\b(\d{1,2})\.(\d{1,2})\b/) ?? null;
  if (m) return nearDate(Number(m[1]), Number(m[2]), t);
  const m2 = text.toLowerCase().match(new RegExp(`\\b(\\d{1,2})\\.\\s*(${MONTHS.map((x) => x.slice(0, 3)).join("|")})\\p{L}*`, "u"));
  if (m2) return nearDate(Number(m2[1]), MONTHS.findIndex((x) => x.startsWith(m2[2])) + 1, t);
  return null;
}

function timeIn(text: string): string | null {
  const m = text.match(/kell\s*(\d{1,2})(?:[.:](\d{2}))?/i) ?? text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

const GREETING = /^(tere|tervist|head|lugupidamisega|tervitades|tervitavasti|parimat|aitäh)\b/i;

export function parseMessage(raw: string, t: Day, assignments: Assignment[]): ParsedMessage | null {
  const lines = decode(raw)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !MSG_NOISE.some((r) => r.test(l)));
  if (!lines.length) return null;
  const text = lines.join("\n");
  const body = lines.filter((l) => !GREETING.test(l));
  const title = shortTitle(body[0] ?? lines[0]);
  const subject = subjectIn(text);
  const when = dateIn(text, t) ?? weekdayIn(text, t)?.day ?? null;
  const time = timeIn(text);
  const actions: MessageAction[] = [];

  // About an upcoming test? Attach the message to it.
  const tests = assignments.filter((a) => a.kind === "test" || a.kind === "retake").filter((a) => a.due > t);
  const bySubject = subject ? tests.filter((a) => subjectIn(a.subject) === subject || a.subject.toLowerCase().includes(subject.toLowerCase())) : [];
  const byDay = when ? tests.filter((a) => a.due === when) : [];
  const target = bySubject.find((a) => !when || a.due === when) ?? (byDay.length === 1 ? byDay[0] : bySubject[0]);
  if (target && /kontrolltöö|tasemekontroll|test|järeltöö|kordamis|kordamine|tööks|tööle/i.test(text)) {
    actions.push({ type: "attach", aid: target.id, label: `${target.subject}: ${target.kind === "retake" ? "järeltöö" : "kontrolltöö"} ${target.due}` });
  }

  // A time to be somewhere? Offer a fixed appointment.
  if (time && when) {
    const what = /järeltöö|parandama/i.test(text) ? `${subject ?? "Järeltöö"}${subject ? " järeltöö" : ""}` : title;
    actions.push({ type: "event", day: when, time, title: what });
  }

  // Otherwise (or as well): a short reminder for tomorrow.
  actions.push({ type: "reminder", due: addDays(t, 1), subject: subject ?? "Kool", title });
  return { title, text, actions };
}
