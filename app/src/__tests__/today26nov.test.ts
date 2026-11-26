import { addDays } from "../dates";
import { makeBackup, readBackup } from "../backup";
import { answerShare, askToShare, hardWeeks, markShareSeen, parentNote, setMood, withdrawShare } from "../mood";
import { eventsOn } from "../planner";
import { emptyState } from "../state";
import { shortSubject } from "../subjects";
import { setDays, subjectsOn } from "../timetable";
import type { AppState, Assignment, Mood } from "../types";

const T = "2026-11-26"; // a Thursday

function st(over: Partial<AppState> = {}): AppState {
  return { ...emptyState(T), setupDone: true, ...over };
}
function hw(id: string, subject: string, due: string): Assignment {
  return { id, kind: "homework", subject, title: "tööleht", due, minutes: 25, createdOn: T, source: "parent" };
}
function moods(days: number[], m: Mood = 4): AppState {
  let s = st();
  for (const d of days) s = setMood(s, addDays(T, -d), m);
  return s;
}

describe("today's lessons", () => {
  it("short names like students write them", () => {
    expect(["Eesti keel", "Matemaatika", "Keemia", "Füüsika", "Inglise keel B1", "Kehaline kasvatus"].map(shortSubject)).toEqual([
      "est", "mat", "keem", "füüs", "ingl", "keh",
    ]);
    expect(shortSubject("Filmikunst")).toBe("film");
    expect(shortSubject("Mat")).toBe("mat");
  });

  it("uses homework due days and the parent's timetable; nothing on weekends", () => {
    let s = st({ assignments: [hw("a", "Matemaatika", T), hw("b", "Keemia", addDays(T, 1)), hw("c", "Eesti keel", addDays(T, -7))] });
    expect(subjectsOn(s, T).map((x) => x.short)).toEqual(["est", "mat"]);
    s = setDays(s, "Füüsika", [3]);
    expect(subjectsOn(s, T).map((x) => x.short)).toEqual(["est", "füüs", "mat"]);
    expect(subjectsOn(s, addDays(T, 2))).toEqual([]); // Saturday
  });
});

describe("activities", () => {
  it("show on their day (weekly too) with the time, tagged as an activity", () => {
    const s = st({ events: [{ id: "e1", title: "Jalgpallitrenn", day: addDays(T, -7), time: "17:00", weekly: true, activity: true }] });
    const ev = eventsOn(s, T, T);
    expect(ev).toEqual([expect.objectContaining({ title: "Jalgpallitrenn", tag: "act", activity: true, time: "17:00" })]);
    expect(eventsOn(s, addDays(T, 1), T)).toEqual([]);
  });
});

describe("telling the parent after hard weeks", () => {
  it("asks only after weeks of 'väga raske', and only on a 'väga raske' day", () => {
    expect(hardWeeks(moods([0, 1, 2]), T)).toBe(false); // one week only
    const s = moods([0, 2, 4, 7, 9, 11]);
    expect(hardWeeks(s, T)).toBe(true);
    expect(askToShare(s, T)).toBe(true);
    expect(askToShare(setMood(s, T, 3), T)).toBe(false);
    expect(hardWeeks(moods([0, 2, 4, 7, 9, 11], 3), T)).toBe(false); // "raske" is not enough
  });

  it("no = nothing for the parent, and no new question for two weeks", () => {
    const s = answerShare(moods([0, 2, 4, 7, 9, 11]), T, false);
    expect(parentNote(s)).toBeNull();
    expect(askToShare(s, T)).toBe(false);
    let later = s;
    for (const d of [8, 10, 12, 15, 17, 20]) later = setMood(later, addDays(T, d), 4);
    expect(askToShare(later, addDays(T, 20))).toBe(true);
  });

  it("yes = one note for the parent until seen; the student can take it back before that", () => {
    const s = answerShare(moods([0, 2, 4, 7, 9, 11]), T, true);
    expect(parentNote(s)).toEqual({ since: T });
    expect(parentNote(withdrawShare(s))).toBeNull();
    const seen = markShareSeen(s, T);
    expect(parentNote(seen)).toBeNull();
    expect(withdrawShare(seen)).toBe(seen);
  });

  it("the answer is not in the backup file and a restore keeps this phone's answer", () => {
    const s = answerShare(moods([0, 2, 4, 7, 9, 11]), T, true);
    const file = makeBackup(s, T, "0.4.0");
    expect(file).not.toContain("moodShare");
    const r = readBackup(file, st(), T);
    expect(r.ok && r.state.moodShare).toBeUndefined();
  });
});
