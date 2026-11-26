import { makeBackup, readBackup } from "../backup";
import { addDays } from "../dates";
import { answerShare, clearShare, offerShare, setMood } from "../mood";
import { eventsOn } from "../planner";
import { emptyState } from "../state";
import { shortSubject } from "../subjects";
import { lessonsOn, setDays } from "../timetable";
import type { AppState, Assignment, Mood } from "../types";

const T = "2026-11-26"; // Thursday

function st(over: Partial<AppState> = {}): AppState {
  return { ...emptyState(T), setupDone: true, ...over };
}
function hw(id: string, subject: string, due: string): Assignment {
  return { id, kind: "homework", subject, title: "tööleht", due, minutes: 25, createdOn: T, source: "parent" };
}
function moods(days: number[], m: Mood = 4): AppState {
  let s = st();
  for (const i of days) s = setMood(s, addDays(T, -i), m);
  return s;
}

describe("today's lessons", () => {
  it("short names the way students write them", () => {
    expect(["Eesti keel", "Matemaatika", "Keemia", "Füüsika", "Inglise keel", "Kehaline kasvatus"].map(shortSubject)).toEqual([
      "est", "mat", "keem", "füüs", "ingl", "keh",
    ]);
    expect(shortSubject("Robootika ring")).toBe("robo");
    expect(shortSubject("Kunst")).toBe("kunst");
  });

  it("lists subjects with a lesson that weekday, from the timetable or due dates", () => {
    let s = st({ assignments: [hw("a", "Matemaatika", T), hw("b", "Keemia", addDays(T, 1))] });
    s = setDays(s, "Füüsika", [3]);
    expect(lessonsOn(s, T)).toEqual(["Füüsika", "Matemaatika"]);
    expect(lessonsOn(s, addDays(T, 1))).toEqual(["Keemia"]);
    expect(lessonsOn(s, addDays(T, 2))).toEqual([]); // Saturday
  });
});

describe("own activities", () => {
  it("shows on its day and weekly, by time, and can skip one day", () => {
    const s = st({
      events: [
        { id: "e1", title: "⚽ Trenn", day: T, time: "17:00", weekly: true, activity: true },
        { id: "e2", title: "Konsultatsioon", day: T, time: "8:15", weekly: false },
        { id: "e3", title: "🩺 Arst", day: T, time: "", weekly: false, activity: true },
      ],
    });
    const today = eventsOn(s, T, T);
    expect(today.map((e) => [e.title, e.tag])).toEqual([
      ["Konsultatsioon", "req"],
      ["⚽ Trenn", "act"],
      ["🩺 Arst", "act"],
    ]);
    const next = addDays(T, 7);
    expect(eventsOn(s, next, T).map((e) => e.title)).toEqual(["⚽ Trenn"]);
    const skipped = { ...s, events: s.events.map((e) => (e.id === "e1" ? { ...e, skip: [next] } : e)) };
    expect(eventsOn(skipped, next, T)).toEqual([]);
    expect(eventsOn(skipped, addDays(T, 14), T).length).toBe(1);
  });
});

describe("let my parent know", () => {
  it("asks only after very hard days in both of the last two weeks, and today too", () => {
    expect(offerShare(moods([0, 1, 2, 3, 4, 5]), T)).toBe(false); // one bad week
    expect(offerShare(moods([0, 2, 8, 10, 12]), T)).toBe(true);
    expect(offerShare(moods([1, 2, 8, 10, 12]), T)).toBe(false); // not "väga raske" today
    expect(offerShare(moods([0, 2, 8, 10, 12], 3), T)).toBe(false); // "raske" is not enough
  });

  it("no shares nothing and doesn't ask again for two weeks; yes leaves one note", () => {
    const base = moods([0, 2, 8, 10, 12]);
    const no = answerShare(base, T, false);
    expect(no.moodNote).toBeUndefined();
    expect(offerShare(no, T)).toBe(false);
    const yes = answerShare(base, T, true);
    expect(yes.moodNote).toEqual({ day: T });
    expect(offerShare(yes, T)).toBe(false);
    expect(clearShare(yes).moodNote).toBeUndefined();
  });

  it("the note and the moods never go into the backup file", () => {
    const s = answerShare(moods([0, 2, 8, 10, 12]), T, true);
    const text = makeBackup(s, T, "0.4.0");
    expect(text).not.toContain("moodNote");
    expect(text).not.toContain("moodAsked");
    expect(text).not.toContain("moods");
    const r = readBackup(text, st(), T);
    expect(r.ok && r.state.moodNote).toBeFalsy();
  });
});
