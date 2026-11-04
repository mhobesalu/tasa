import { addDays } from "../dates";
import { dayFull, dayItems, freezeToday, rewardSummary } from "../logic";
import { buildPlan, retakeChunks, stepsOf } from "../planner";
import { emptyState } from "../state";
import type { AppState, Assignment } from "../types";

const T = "2026-11-03"; // a Tuesday

function hw(id: string, dueIn: number, minutes: number, extra: Partial<Assignment> = {}): Assignment {
  return { id, kind: "homework", subject: "Mat", title: "tööleht", due: addDays(T, dueIn), minutes, createdOn: T, source: "parent", ...extra };
}
function st(assignments: Assignment[], over: Partial<AppState> = {}): AppState {
  return { ...emptyState(T), setupDone: true, assignments, budget: 1000, ...over };
}

test("work is split into ~25 minute steps", () => {
  const s = stepsOf(hw("a", 3, 60));
  expect(s.map((x) => x.minutes)).toEqual([25, 25, 10]);
  expect(s[0].title).toBe("Mat: tööleht, samm 1/3");
});

test("wrong problems spread over 2–3 days: 5 wrong → 2 + 2 + 1", () => {
  expect(retakeChunks([7, 1, 3, 4, 6])).toEqual([[1, 3], [4, 6], [7]]);
  expect(retakeChunks([2])).toEqual([[2]]);
  expect(retakeChunks([1, 2, 3])).toEqual([[1, 2], [3]]);
});

test("retake steps name the problems and land on the days before the retake", () => {
  const a = hw("r", 5, 0, { kind: "retake", subject: "Matemaatika", wrong: [1, 2, 5] });
  const p = buildPlan(st([a]), T);
  const days = Object.keys(p.byDay).sort();
  expect(days).toEqual([addDays(T, 3), addDays(T, 4)]);
  expect(p.byDay[days[0]][0].title).toBe("Matemaatika järeltöö: harjuta ülesandeid 1 ja 2");
});

test("book pages are split into exact daily pages", () => {
  const a = hw("b", 4, 0, { kind: "book", subject: "Eesti keel", title: "Kevade", pageFrom: 41, pageTo: 120 });
  const s = stepsOf(a);
  expect(s.map((x) => x.title.split("loe ")[1])).toEqual(["lk 41–60", "lk 61–80", "lk 81–100", "lk 101–120"]);
});

test("test prep starts at most 7 days before", () => {
  const a = hw("t", 14, 50, { kind: "test" });
  const p = buildPlan(st([a]), T);
  const first = Object.keys(p.byDay).sort()[0];
  expect(first >= addDays(T, 7)).toBe(true);
});

test("steps go before the deadline, nearest deadline first", () => {
  const p = buildPlan(st([hw("late", 5, 25), hw("soon", 1, 25)]), T);
  expect(p.byDay[T].map((x) => x.aid)).toEqual(["soon", "late"]);
  for (const x of Object.values(p.all)) expect(x.day < x.due).toBe(true);
});

test("budget pushes extra work to later days when there is time", () => {
  const p = buildPlan(st([hw("a", 1, 50), hw("b", 5, 100)], { budget: 75 }), T);
  const mins = (d: string) => (p.byDay[d] ?? []).reduce((m, x) => m + x.minutes, 0);
  expect(mins(T)).toBeLessThanOrEqual(75);
});

test("ticking does not change the rest of today's plan", () => {
  let s = freezeToday(st([hw("a", 4, 100)]), T);
  const before = s.days[T];
  s = { ...s, done: { [before[0]]: T } };
  s = freezeToday(s, T);
  expect(s.days[T]).toEqual(before);
});

test("day reward only for a day finished on that day", () => {
  let s = st([hw("a", 2, 50)], {
    reward: { on: true, name: "Taskuraha", unit: "eur", per: "day", amount: 3, goal: 0, bonus: 0, since: T },
  });
  s = freezeToday(s, T);
  const ids = s.days[T];
  expect(ids.length).toBe(1);
  // not done today; done tomorrow as a leftover
  const tom = addDays(T, 1);
  s = freezeToday(s, tom);
  expect(dayItems(s, tom).some((x) => x.leftover)).toBe(true);
  s = { ...s, done: Object.fromEntries(s.days[tom].map((id) => [id, tom])) };
  expect(dayFull(s, T)).toBe(false);
  expect(dayFull(s, tom)).toBe(true);
  expect(rewardSummary(s, tom).earned).toBe(3); // only tomorrow, not the missed day
});

test("per-step reward and payouts", () => {
  let s = st([hw("a", 3, 75)], {
    reward: { on: true, name: "Ekraaniaeg", unit: "minutit", per: "step", amount: 10, goal: 0, bonus: 0, since: T },
  });
  s = freezeToday(s, T);
  s = { ...s, done: { [s.days[T][0]]: T }, payouts: [{ day: T, amount: 5, note: "" }] };
  const r = rewardSummary(s, T);
  expect(r.earned).toBe(10);
  expect(r.balance).toBe(5);
});

test("excused steps don't block the day", () => {
  let s = freezeToday(st([hw("a", 1, 25), hw("b", 1, 25)]), T);
  const [x, y] = s.days[T];
  s = { ...s, excused: { [y]: true }, done: { [x]: T } };
  expect(dayFull(s, T)).toBe(true);
});

test("e-diary due date means done before school: work is planned by the day before", () => {
  // Due Thursday in the diary -> everything planned Tue/Wed, nothing on Thursday itself.
  const p = buildPlan(st([hw("a", 2, 100), hw("b", 1, 50)]), T);
  for (const x of Object.values(p.all)) expect(x.day < x.due).toBe(true);
  expect(p.byDay[addDays(T, 2)]).toBeUndefined();
  // Due tomorrow -> all of it today.
  expect(Object.values(p.all).filter((x) => x.aid === "b").every((x) => x.day === T)).toBe(true);
});
