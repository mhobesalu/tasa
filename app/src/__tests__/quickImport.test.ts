import { planImport } from "../quickImport";
import { GRADES_SHOTS, HOMEWORK_SHOTS, MSG_SHOT, HOMEWORK_PHONE, MSG_NOTEBOOK } from "../testdata/stuudium";
import { parseGrades } from "../importText";
import type { Assignment } from "../types";

const T = "2026-11-10";

test("one tap adds only new, upcoming items", () => {
  const r = planImport(HOMEWORK_PHONE, T, []);
  // the item due today is skipped (it had to be done before school)
  expect(r.skipped).toBe(1);
  expect(r.add.map((d) => d.subject)).toEqual(["Eesti keel I", "Eesti keel I", "Mat 1", "Ajalugu", "Muusikaajalugu", "Muusikaajalugu"]);
});

test("pasting the same page again adds nothing new", () => {
  const first = planImport(HOMEWORK_PHONE, T, []);
  const planned: Assignment[] = first.add.map((d, i) => ({
    id: `p${i}`, kind: d.kind, subject: d.subject, title: d.title, due: d.due, minutes: d.minutes, createdOn: T, source: "parent",
  }));
  const again = planImport(HOMEWORK_PHONE, T, planned);
  expect(again.add).toEqual([]);
  expect(again.skipped).toBe(7);
});

test("two overlapping screenshots don't add the same task twice", () => {
  const r = planImport(HOMEWORK_PHONE + "\n" + HOMEWORK_PHONE, T, []);
  expect(r.add.length).toBe(6);
});

test("a message is offered as a message", () => {
  const r = planImport(MSG_NOTEBOOK, T, []);
  expect(r.add).toEqual([]);
  expect(r.message?.actions.length).toBeGreaterThan(0);
});

import { linesInOrder } from "../native";
test("recognised text is read top to bottom, left to right", () => {
  const f = (top: number, left: number) => ({ top, left });
  expect(
    linesInOrder([
      { text: "b", lines: [{ text: "Mat 1", frame: f(200, 10) }, { text: "Avaldised", frame: f(240, 10) }] },
      { text: "c", lines: [{ text: "Kontrolltöö", frame: f(201, 200) }] },
      { text: "a", lines: [{ text: "K 11. november", frame: f(100, 10) }, { text: "homme", frame: f(102, 300) }] },
    ]),
  ).toEqual(["K 11. november homme", "Mat 1 Kontrolltöö", "Avaldised"]);
});

test("screenshots of the Stuudium app: wrapped text, cut-off tasks, app chrome", () => {
  const r = planImport(HOMEWORK_SHOTS, T, []);
  expect(r.add.map((d) => `${d.due} ${d.kind} ${d.minutes} ${d.subject}`)).toEqual([
    "2026-11-11 homework 60 Eesti keel I",
    "2026-11-11 homework 5 Eesti keel I",
    "2026-11-11 test 50 Mat 1",
    "2026-11-12 test 50 Ajalugu",
    "2026-11-13 homework 60 Filmiõpetus",
    "2026-11-13 test 50 Muusikaajalugu",
  ]);
  const film = r.add[4];
  expect(film.title).toBe("Kirjuta 1-3 sündmuse kirjeldust, millest saaks hea loo");
  expect(r.add[0].note).toContain("Tera:");
  expect(r.skipped).toBe(1);
});

test("grade screenshots: marks on the next row and a teacher called August", () => {
  expect(parseGrades(GRADES_SHOTS)).toEqual([
    { subject: "Mat 1", marks: ["2"] },
    { subject: "Füüsika 1", marks: ["2"] },
  ]);
});

test("a message screenshot becomes a fixed appointment", () => {
  const r = planImport(MSG_SHOT, T, []);
  expect(r.message?.title).toBe("10K Kunstimuuseumis");
  expect(r.message?.actions[0]).toEqual({ type: "event", day: "2026-11-13", time: "12:30", title: "10K Kunstimuuseumis" });
  expect(r.message?.text).not.toMatch(/Vasta|Arhiveeri|Stuudium/);
});

describe("worksheet photo in quick import", () => {
  it("offers the numbers for a kontrolltöö instead of a reminder", () => {
    const r = planImport("41. Lihtsusta avaldis.\n(y-x)\n42. Lihtsusta avaldis.\nab\n43. Lihtsusta avaldis.\n44. Lihtsusta avaldis.", "2026-11-10", []);
    expect(r.review).toEqual(["41", "42", "43", "44"]);
    expect(r.message).toBeNull();
  });
});
