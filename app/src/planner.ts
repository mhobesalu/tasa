import { addDays, diffDays, relDate, weekdayIndex, type Day } from "./dates";
import type { AppState, Assignment, FixedEvent, PlannedStep, Step } from "./types";

export const STEP_MIN = 25;
const MAX_STEPS = 40;
/** Test prep starts at most this many days before the test. */
export const TEST_PREP_DAYS = 7;

export function numList(ns: number[]): string {
  const s = [...ns].sort((a, b) => a - b);
  if (s.length === 1) return `ülesannet ${s[0]}`;
  return `ülesandeid ${s.slice(0, -1).join(", ")} ja ${s[s.length - 1]}`;
}

/** Split wrong problems over 2–3 days, e.g. 5 wrong → 2 + 2 + 1. */
export function retakeChunks(wrong: number[]): number[][] {
  const w = [...new Set(wrong)].sort((a, b) => a - b);
  if (!w.length) return [];
  const parts = Math.min(3, Math.max(1, Math.ceil(w.length / 2)));
  const per = Math.ceil(w.length / parts);
  const out: number[][] = [];
  for (let i = 0; i < w.length; i += per) out.push(w.slice(i, i + per));
  return out;
}

/**
 * Read what the parent typed as kordamisküsimused / -ülesanded.
 * "1-5, 8" or "1–5 ja 8" → ["1","2","3","4","5","8"]; anything else → one item per line (or ";").
 */
export function parseReview(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (/^[\d\s,.;–—-]+$|^[\d\s,.;–—-]*(ja|and)[\d\s,.;–—-]*$/i.test(t) && /\d/.test(t)) {
    const out: number[] = [];
    for (const part of t.split(/[,;]|\s+ja\s+|\s+and\s+|\s+(?=\d)/i)) {
      const m = part.trim().match(/^(\d+)\s*(?:[–—-]\s*(\d+))?\.?$/);
      if (!m) continue;
      const a = +m[1], b = m[2] ? +m[2] : a;
      for (let n = Math.min(a, b); n <= Math.max(a, b) && out.length < 200; n++) out.push(n);
    }
    return [...new Set(out)].map(String);
  }
  const lines = t
    .split(t.includes("\n") ? /\n/ : /;/)
    .map((x) => x.trim())
    .filter((x) => x && !/^[–-]{2,}.*[–-]{2,}$/.test(x)); // screenshot breaks
  const NUM = /^(\d{1,3})\s*[.)]\s*(.*)$/;
  const BULLET = /^[-•*–]\s*(.*)$/;
  if (lines.filter((x) => NUM.test(x)).length >= 2) {
    // numbered list: wrapped lines join the item above, a heading before the first number is dropped
    const items: { n: number; body: string }[] = [];
    const extra = new Map<object, number>(); // continuation lines per item
    const head1 = new Map<object, string>(); // the numbered line itself
    for (const line of lines) {
      const m = line.match(NUM);
      const bm = line.match(BULLET);
      if (m) items.push({ n: +m[1], body: m[2].trim() });
      else if (bm) items.push({ n: (items[items.length - 1]?.n ?? 0) + 1, body: bm[1].trim() });
      else if (items.length) {
        const last = items[items.length - 1];
        extra.set(last, (extra.get(last) ?? 0) + 1);
        if (!head1.has(last)) head1.set(last, last.body);
        last.body = last.body ? `${last.body} ${line}` : line;
      }
    }
    // A worksheet where every task starts the same way ("Lihtsusta avaldis.") or holds formulas
    // the text reader can't read: the numbers are what matter.
    const head = (x: string) => x.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    const counts: Record<string, number> = {};
    for (const it of items) if (it.body) counts[head(it.body)] = (counts[head(it.body)] ?? 0) + 1;
    const [top, topN] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0] ?? ["", 0];
    const letters = (x: string) => (x.match(/[a-zõäöüšž]/gi) ?? []).length / Math.max(1, x.replace(/\s/g, "").length);
    const garbled = items.filter((it) => !it.body || letters(it.body) < 0.6).length;
    if (items.length >= 3 && (topN >= Math.max(2, items.length * 0.4) || garbled > items.length / 2)) {
      const keep = topN >= 2 ? items.filter((it) => !it.body || head(it.body) === top) : items;
      return [...new Set(keep.map((it) => it.n))].sort((x, y) => x - y).map(String);
    }
    // An answer sheet (several lines under each number): the numbered line is the question / topic.
    const many = items.filter((it) => (extra.get(it) ?? 0) >= 2).length > items.length / 2;
    return items.map((it) => (many && head1.get(it) ? head1.get(it)! : it.body)).filter(Boolean).slice(0, 100);
  }
  // An answer sheet without numbers (numbering lost when copying): short heading lines with notes under them.
  const isHead = (x: string) => x.length <= 60 && !/[.,;:!]$/.test(x) && !x.includes(":") && /^\p{Lu}/u.test(x);
  if (lines.length >= 15) {
    const heads = lines.map((x, i) => (isHead(x) && i + 1 < lines.length && !isHead(lines[i + 1]) ? i : -1)).filter((i) => i >= 0);
    const gaps = heads.slice(1).map((h, k) => h - heads[k]);
    const hs = new Set(heads);
    const notes = lines.filter((_, i) => !hs.has(i) && i > (heads[0] ?? 0));
    const noteLike = notes.filter((x) => /[.)]$/.test(x) || /^[^:]{2,30}:\s/.test(x)).length;
    if (heads.length >= 4 && heads.length <= lines.length / 2.5 && gaps.filter((g) => g >= 2).length >= gaps.length * 0.8 && noteLike >= notes.length * 0.6)
      return heads.map((i) => lines[i]).slice(0, 100);
  }
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(BULLET);
    const body = m ? m[1].trim() : line;
    const prev = out[out.length - 1];
    if (!m && prev !== undefined && !/[?.!:]$/.test(prev) && /^[a-zõäöü(]/.test(body)) out[out.length - 1] = `${prev} ${body}`;
    else if (body) out.push(body);
  }
  return out.slice(0, 100);
}

/** "Sokrates, Pythagoras, Aleksander…": the topics of one step, short enough for a title. */
export function topicNames(items: string[], max = 60): string {
  const short = items.map((x) => {
    const t = x.replace(/[?.:!]+$/, "").trim();
    return t.length <= 28 ? t : t.slice(0, 27).replace(/\s\S*$/, "") + "…";
  });
  let out = "";
  for (const t of short) {
    const next = out ? `${out}, ${t}` : t;
    if (next.length > max && out) return `${out}…`;
    out = next;
  }
  return out;
}

/** Numbers back as editable text: ["1","2","3","5"] → "1–3, 5". */
export function rangeText(items: string[]): string {
  const n = items.map(Number);
  const parts: string[] = [];
  for (let i = 0; i < n.length; ) {
    let j = i;
    while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++;
    parts.push(j - i >= 2 ? `${n[i]}–${n[j]}` : n.slice(i, j + 1).join(", "));
    i = j + 1;
  }
  return parts.join(", ");
}

/** "nr 1–4" or "nr 1, 3 ja 5" for numeric items. */
export function numRange(items: string[]): string {
  const n = items.map(Number);
  const run = n.every((x, i) => i === 0 || x === n[i - 1] + 1);
  if (n.length > 2 && run) return `nr ${n[0]}–${n[n.length - 1]}`;
  if (n.length === 1) return `nr ${n[0]}`;
  return `nr ${n.slice(0, -1).join(", ")} ja ${n[n.length - 1]}`;
}

/** Split items in order into n nearly equal parts. */
function splitEven<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < n; i++) out.push(xs.slice(Math.floor((i * xs.length) / n), Math.floor(((i + 1) * xs.length) / n)));
  return out.filter((x) => x.length);
}

/** A reading task: "Loe raamat …", "lugemine", "kohustuslik kirjandus". */
export const READING = /\b(loe(?:ge)?|lugeda|lugemine|lugemiseks|raamat\w*|kohustuslik kirjandus)\b/i;

/** Turn one assignment into its fixed list of ~25-minute steps. Ids stay stable. */
export function stepsOf(a: Assignment): Step[] {
  const base = { aid: a.id, kind: a.kind, subject: a.subject };
  const mk = (i: number, total: number, title: string, minutes: number, note: string): Step => ({
    ...base,
    id: `${a.id}#${i}`,
    index: i,
    total,
    title,
    minutes,
    note,
  });

  if (a.kind === "book") {
    const from = a.pageFrom ?? 1;
    const to = Math.max(from, a.pageTo ?? from);
    const pages = to - from + 1;
    const days = Math.max(1, diffDays(a.createdOn, a.due));
    const n = Math.min(days, pages, MAX_STEPS);
    const steps: Step[] = [];
    for (let i = 0; i < n; i++) {
      const p0 = from + Math.floor((i * pages) / n);
      const p1 = from + Math.floor(((i + 1) * pages) / n) - 1;
      const pp = p0 === p1 ? `lk ${p0}` : `lk ${p0}–${p1}`;
      steps.push(
        mk(i, n, `${a.subject}: ${a.title}, loe ${pp}`, STEP_MIN,
          a.note || `Kokku lk ${from}–${to}. Iga päev natuke, siis jõuad rahulikult.`),
      );
    }
    return steps;
  }

  if (a.kind === "retake") {
    const chunks = retakeChunks(a.wrong ?? []);
    if (!chunks.length)
      // date added by the student: the wrong problems aren't known, so plan general review
      return [0, 1].map((i) =>
        mk(i, 2, `${a.subject}: järeltööks kordamine ${i + 1}/2`, STEP_MIN,
          a.note || "Korda kontrolltöö teemat oma vihiku, töö ja kooli materjali järgi. Kui tead, mis läks valesti, harjuta just seda."),
      );
    return chunks.map((c, i) =>
      mk(i, chunks.length, `${a.subject} järeltöö: harjuta ${numList(c)}`, STEP_MIN,
        "Need ülesanded läksid kontrolltöös valesti. Tee need oma töö ja kooli materjali järgi uuesti läbi."),
    );
  }

  const n = Math.min(MAX_STEPS, Math.max(1, Math.ceil(a.minutes / STEP_MIN)));
  const base_n = n;
  if (a.kind === "test" && a.review?.length) {
    // about 4 problems or 5 questions per 25-minute step, even if the parent guessed less time
    const per = a.review.every((x) => /^\d+$/.test(x)) ? 4 : 5;
    const n = Math.min(8, Math.max(base_n, Math.ceil(a.review.length / per)));
    // the parent's kordamisküsimused / -ülesanded in order; any steps left over go over everything again
    const parts = splitEven(a.review, Math.min(n, a.review.length));
    const numeric = a.review.every((x) => /^\d+$/.test(x));
    return Array.from({ length: n }, (_, i) => {
      const m = n > base_n || i < n - 1 ? STEP_MIN : Math.max(5, a.minutes - STEP_MIN * (n - 1));
      const head = `${a.subject}: kontrolltööks kordamine${n > 1 ? ` ${i + 1}/${n}` : ""}`;
      const p = parts[i];
      if (!p) return mk(i, n, `${head}, kõik uuesti üle`, m, a.note || "Vaata kõik kordamisküsimused veel kord üle.");
      if (numeric) return mk(i, n, `${head}, ${numRange(p)}`, m, a.note || "");
      const list = p.map((x) => `• ${x}`).join("\n");
      return mk(i, n, `${head}: ${topicNames(p)}`, m, a.note ? `${a.note}\n${list}` : list);
    });
  }
  // Reading a book or a longer text: a little every day until it's due, not all at the end.
  if ((a.kind === "homework" || a.kind === "project") && READING.test(`${a.title} ${a.note ?? ""}`)) {
    const days = Math.min(7, diffDays(a.createdOn, a.due));
    if (days >= 2) {
      const r = Math.max(n, days);
      const per = Math.max(10, Math.ceil(a.minutes / r / 5) * 5);
      return Array.from({ length: r }, (_, i) =>
        mk(i, r, `${a.subject}: ${a.title}, loe edasi ${i + 1}/${r}`, per,
          a.note || "Loe täna natuke. Iga päev natuke, siis jõuad rahulikult."),
      );
    }
  }
  const steps: Step[] = [];
  for (let i = 0; i < n; i++) {
    const m = i < n - 1 ? STEP_MIN : Math.max(5, a.minutes - STEP_MIN * (n - 1));
    const title =
      a.kind === "test"
        ? `${a.subject}: kontrolltööks kordamine ${i + 1}/${n}`
        : `${a.subject}: ${a.title}${n > 1 ? `, samm ${i + 1}/${n}` : ""}`;
    steps.push(mk(i, n, title, m, a.note || ""));
  }
  return steps;
}

/** First day work on this assignment may be planned. */
function startDay(a: Assignment, t: Day, nSteps: number): Day {
  if (a.kind === "test") {
    const s = addDays(a.due, -TEST_PREP_DAYS);
    return diffDays(t, s) > 0 ? s : t;
  }
  if (a.kind === "retake") {
    const s = addDays(a.due, -Math.max(1, nSteps));
    return diffDays(t, s) > 0 ? s : t;
  }
  return t;
}

/** Last day work may be planned: the day before it's due (or today if that has passed). */
function lastDay(a: Assignment, start: Day): Day {
  const l = addDays(a.due, -1);
  return diffDays(start, l) >= 0 ? l : start;
}

export interface Plan {
  /** day -> steps planned for that day (today and later) */
  byDay: Record<Day, PlannedStep[]>;
  /** every step, by id */
  all: Record<string, PlannedStep>;
}

/**
 * Spread every unfinished step over the days before its deadline, nearest deadline first,
 * keeping each day near the study-time budget. Steps already done today stay on today,
 * so ticking never changes the rest of today's plan.
 */
export function buildPlan(s: Pick<AppState, "assignments" | "done" | "excused" | "budget">, t: Day): Plan {
  const byDay: Record<Day, PlannedStep[]> = {};
  const all: Record<string, PlannedStep> = {};
  const put = (st: PlannedStep) => {
    (byDay[st.day] ||= []).push(st);
    all[st.id] = st;
  };
  const lastOf: Record<string, Day> = {};

  const sorted = [...s.assignments].sort(
    (a, b) => diffDays(b.due, a.due) || a.createdOn.localeCompare(b.createdOn) || a.id.localeCompare(b.id),
  );
  for (const a of sorted) {
    const steps = stepsOf(a).filter((x) => !s.excused[x.id]);
    const start = startDay(a, t, steps.length);
    const last = lastDay(a, start);
    lastOf[a.id] = last;
    const doneToday = steps.filter((x) => s.done[x.id] === t);
    const remaining = steps.filter((x) => !s.done[x.id]);
    // Steps finished on earlier days are simply gone from the plan.
    for (const x of doneToday) put({ ...x, day: t, due: a.due });
    const total = doneToday.length + remaining.length;
    if (!remaining.length) continue;
    const D = diffDays(start, last) + 1;
    const slots: number[] = [];
    for (let k = 0; k < total; k++) slots.push(Math.floor((k * D) / total));
    const mySlots = slots.slice(doneToday.length);
    remaining.forEach((x, i) => {
      // Doing extra today must never leave today's share smaller than 0, so slots are offsets from start.
      put({ ...x, day: addDays(start, mySlots[i]), due: a.due });
    });
  }

  // Budget: if a day is too full, move the latest-deadline steps to a later day if they still fit before it's due.
  const maxDay = () => Object.keys(byDay).sort().pop() as Day;
  const first = Object.keys(byDay).sort()[0];
  if (first) {
    for (let d = first; diffDays(d, maxDay()) >= 0; d = addDays(d, 1)) {
      const list = byDay[d];
      if (!list) continue;
      let mins = list.reduce((m, x) => m + x.minutes, 0);
      if (mins <= s.budget) continue;
      const movable = list
        .filter((x) => !(d === t && s.done[x.id] === t) && diffDays(d, lastOf[x.aid]) > 0)
        // latest deadline first, last step of it first
        .sort((a, b) => diffDays(a.due, b.due) || b.index - a.index);
      for (const x of movable) {
        if (mins <= s.budget) break;
        const next = addDays(d, 1);
        byDay[d] = byDay[d].filter((y) => y.id !== x.id);
        const moved = { ...x, day: next };
        (byDay[next] ||= []).push(moved);
        all[x.id] = moved;
        mins -= x.minutes;
      }
    }
  }

  for (const d of Object.keys(byDay)) {
    byDay[d].sort((a, b) => diffDays(b.due, a.due) || a.aid.localeCompare(b.aid) || a.index - b.index);
  }
  return { byDay, all };
}

/** Fixed required events and test / retake days that fall on a given day. */
export interface DayEvent {
  key: string;
  title: string;
  when: string;
  tag: "req" | "test" | "retake" | "due";
}

export function eventsOn(s: Pick<AppState, "assignments" | "events">, day: Day, ref: Day): DayEvent[] {
  const out: DayEvent[] = [];
  for (const e of s.events) {
    const n = diffDays(e.day, day);
    if (n === 0 || (e.weekly && n > 0 && n % 7 === 0)) {
      out.push({ key: e.id, title: e.title, when: `${relDate(day, ref)} ${e.time}`.trim(), tag: "req" });
    }
  }
  for (const a of s.assignments) {
    if (a.due !== day) continue;
    if (a.kind === "test") out.push({ key: a.id, title: `${a.subject} kontrolltöö`, when: relDate(day, ref), tag: "test" });
    else if (a.kind === "retake") out.push({ key: a.id, title: `${a.subject} järeltöö`, when: relDate(day, ref), tag: "retake" });
    else out.push({ key: a.id, title: `${a.subject}: ${a.title} tuleb ära anda`, when: relDate(day, ref), tag: "due" });
  }
  return out;
}

export function isWeekend(day: Day) {
  return weekdayIndex(day) >= 5;
}
