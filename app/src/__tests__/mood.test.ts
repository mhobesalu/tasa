import { addDays } from "../dates";
import { makeLighter, offerLighter, setMood } from "../mood";
import { buildPlan } from "../planner";
import { emptyState } from "../state";
import type { AppState, Assignment } from "../types";

const T = "2026-11-03";

function hw(id: string, dueIn: number, minutes: number): Assignment {
  return { id, kind: "homework", subject: "Mat", title: "tööleht", due: addDays(T, dueIn), minutes, createdOn: T, source: "parent" };
}
function st(over: Partial<AppState> = {}): AppState {
  return { ...emptyState(T), setupDone: true, ...over };
}

describe("mood check-in", () => {
  it("offers a lighter tomorrow after two heavy days out of three", () => {
    let s = st();
    s = setMood(s, T, 3);
    expect(offerLighter(s, T)).toBe(false);
    s = setMood(s, addDays(T, -2), 4);
    expect(offerLighter(s, T)).toBe(true);
    s = makeLighter(s, addDays(T, 1));
    expect(offerLighter(s, T)).toBe(false);
  });

  it("good days never trigger it, and a mood can be cleared", () => {
    let s = setMood(setMood(st(), T, 1), addDays(T, -1), 2);
    expect(offerLighter(s, T)).toBe(false);
    s = setMood(s, T, null);
    expect(s.moods?.[T]).toBeUndefined();
  });

  it("a lighter day moves work to later days when the deadline allows", () => {
    const s = st({ budget: 100, assignments: [hw("a", 6, 200)] });
    const tomorrow = addDays(T, 1);
    const mins = (p: ReturnType<typeof buildPlan>, d: string) => (p.byDay[d] ?? []).reduce((m, x) => m + x.minutes, 0);
    const normal = buildPlan(s, T);
    const light = buildPlan(makeLighter(s, tomorrow), T);
    expect(mins(light, tomorrow)).toBeLessThanOrEqual(60);
    expect(mins(light, tomorrow)).toBeLessThanOrEqual(mins(normal, tomorrow));
    // nothing is dropped and nothing goes past the deadline
    expect(Object.keys(light.all).length).toBe(Object.keys(normal.all).length);
    for (const x of Object.values(light.all)) expect(x.day < x.due).toBe(true);
  });
});
