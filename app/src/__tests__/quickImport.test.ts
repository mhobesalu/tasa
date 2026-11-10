import { planImport } from "../quickImport";
import { HOMEWORK_PHONE, MSG_NOTEBOOK } from "../testdata/stuudium";
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
      { text: "a", lines: [{ text: "K 11. november", frame: f(100, 10) }, { text: "homme", frame: f(102, 300) }] },
    ]),
  ).toEqual(["K 11. november", "homme", "Mat 1", "Avaldised"]);
});
