import { emptyState } from "../state";
import { cleanSubject, isSubjectName, matchSubject, renameSubject, tidySubjects } from "../subjects";
import type { AppState, Assignment } from "../types";

const T = "2026-11-10";
const a = (id: string, subject: string): Assignment => ({
  id, kind: "homework", subject, title: "Ülesanne", due: "2026-11-12", minutes: 20, createdOn: T, source: "parent",
});
const st = (subjects: string[], extra: Partial<AppState> = {}): AppState => ({
  ...emptyState(T),
  assignments: subjects.map((s, i) => a(`p${i}`, s)),
  ...extra,
});

// made-up OCR misreads of the kind screenshots produce
test("screenshot icons are removed from subject names", () => {
  expect(cleanSubject("OMuusikaajalugu")).toBe("Muusikaajalugu");
  expect(cleanSubject("| Bioloogia")).toBe("Bioloogia");
  expect(cleanSubject("Geograafia |")).toBe("Geograafia");
  expect(cleanSubject("Kunst O")).toBe("Kunst");
  expect(cleanSubject("Füüsika 1 )")).toBe("Füüsika 1");
  expect(cleanSubject("Matemaatika (lai)")).toBe("Matemaatika (lai)");
  expect(cleanSubject("Omandiõigus")).toBe("Omandiõigus");
  expect(cleanSubject("Mat 1")).toBe("Mat 1");
});

test("a name with no letters is not a subject", () => {
  expect(isSubjectName("14")).toBe(false);
  expect(isSubjectName("|")).toBe(false);
  expect(isSubjectName("Ke")).toBe(true);
  expect(isSubjectName("um V3.0,25")).toBe(false);
  expect(isSubjectName("Mat 1")).toBe(true);
  expect(isSubjectName("Eesti keel I")).toBe(true);
});

test("a new task joins the subject already in the plan", () => {
  const s = st(["Muusikaajalugu"]);
  expect(matchSubject("OMuusikaajalugu", s)).toBe("Muusikaajalugu");
  expect(matchSubject("muusikaajalugu |", s)).toBe("Muusikaajalugu");
  expect(matchSubject("Kunst", s)).toBe("Kunst");
});

test("rename merges into an existing subject everywhere", () => {
  const s = st(["14", "Eesti keel", "Eesti keel"], {
    timetable: { "14": [1] },
    pendingRetakes: [{ id: "r1", subject: "14", since: T }, { id: "r2", subject: "Eesti keel", since: T }],
  });
  const r = renameSubject(s, "14", "eesti keel");
  expect(r.assignments.map((x) => x.subject)).toEqual(["Eesti keel", "Eesti keel", "Eesti keel"]);
  expect(r.timetable).toEqual({ "eesti keel": [1] });
  expect(r.pendingRetakes).toHaveLength(1);
});

test("old saved names are tidied on load", () => {
  const r = tidySubjects(st(["OMuusikaajalugu", "Muusikaajalugu", "Keemia |", "14"]));
  expect(r.assignments.map((x) => x.subject)).toEqual(["Muusikaajalugu", "Muusikaajalugu", "Keemia", "14"]);
});
