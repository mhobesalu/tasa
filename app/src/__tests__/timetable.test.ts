import { emptyState } from "../state";
import { knownSubjects, lessonDays, nextLesson, setDays } from "../timetable";
import type { AppState, Assignment } from "../types";

const T = "2026-11-10"; // Tuesday
const hw = (subject: string, due: string): Assignment => ({
  id: subject + due, kind: "homework", subject, title: "x", due, minutes: 25, createdOn: T, source: "parent",
});

test("lesson days are learned from homework due dates", () => {
  const s: AppState = { ...emptyState(T), assignments: [hw("Kunst", "2026-11-04"), hw("Kunst", "2026-11-11"), hw("Mat 1", "2026-11-12")] };
  expect(lessonDays(s, "kunst")).toEqual({ days: [2], manual: false });
  expect(nextLesson(s, "Kunst", T)).toBe("2026-11-11");
  expect(nextLesson(s, "Keemia", T)).toBeNull();
  expect(knownSubjects(s)).toEqual(["Kunst", "Mat 1"]);
});

test("days set by the parent win", () => {
  let s: AppState = { ...emptyState(T), assignments: [hw("Kunst", "2026-11-11")] };
  s = setDays(s, "Kunst", [4, 0]);
  expect(lessonDays(s, "Kunst")).toEqual({ days: [0, 4], manual: true });
  expect(nextLesson(s, "Kunst", T)).toBe("2026-11-13");
});
