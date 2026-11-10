import { GRADES_SUMMARY, GRADES_SUMMARY_PHONE, GRADES_TABLE, HOMEWORK, HOMEWORK_PHONE, MSG_NOTEBOOK, MSG_RETAKE, MSG_TEST } from "../testdata/stuudium";
import type { Assignment } from "../types";
import { parseDayHeader, parseGrades, parseMessage, parsePasted, parseSubjectLine } from "../importText";

const T = "2026-11-10";
const sample = HOMEWORK;

test("day headers from Stuudium and plain dates", () => {
  expect(parseDayHeader("T 10. novembertäna", T)).toBe("2026-11-10");
  expect(parseDayHeader("K 11. novemberhomme", T)).toBe("2026-11-11");
  expect(parseDayHeader("N 12. november", T)).toBe("2026-11-12");
  expect(parseDayHeader("Kolmapäev, 11.11.2026", T)).toBe("2026-11-11");
  expect(parseDayHeader("K 07.01", T)).toBe("2027-01-07");
  expect(parseDayHeader("Inglise keel I", T)).toBeNull();
  expect(parseDayHeader("KI Kompositsioon, K 07. oktoober", T)).toBeNull();
});

test("subject lines: duration and test markers", () => {
  expect(parseSubjectLine("Praktiline eesti keel I1 h")).toEqual({ subject: "Praktiline eesti keel I", minutes: 60, test: false });
  expect(parseSubjectLine("Muusikaajalugu I1 h 30 min")).toEqual({ subject: "Muusikaajalugu I", minutes: 90, test: false });
  expect(parseSubjectLine("Mat 1: Arvuhulgad. Avaldised. (K) Kontrolltöö")).toEqual({ subject: "Mat 1", minutes: null, test: true });
});

test("a Stuudium homework list becomes tasks", () => {
  const d = parsePasted(sample, T);
  expect(d.map((x) => [x.due, x.subject, x.kind])).toEqual([
    ["2026-11-10", "Inglise keel I", "homework"],
    ["2026-11-11", "Eesti keel I", "homework"],
    ["2026-11-11", "Eesti keel I", "homework"],
    ["2026-11-11", "Mat 1", "test"],
    ["2026-11-12", "Ajalugu", "test"],
    ["2026-11-12", "Filmiõpetus", "homework"],
    ["2026-11-13", "Kirjandus", "homework"],
    ["2026-11-13", "Muusikaajalugu", "test"],
    ["2026-11-13", "Muusikaajalugu", "homework"],
    ["2026-11-17", "Kirjandus", "test"],
  ]);
  expect(d[1].minutes).toBe(60);
  expect(d[1].title).toBe("Loe kodus läbi õpikutekst ,,Sõnaliigid\" ja tee tunnis alustatud tööleht lõpuni");
  expect(d[1].note).toContain("https://example.ope.ee/tera/r/1/1");
  expect(d[3].title).toBe("Avaldiste lihtsustamine");
  expect(d[8].minutes).toBe(90);
  // the overdue "Tegemata" block at the bottom is not imported
  expect(d.some((x) => x.subject.startsWith("Kunst"))).toBe(false);
});

test("HTML entities from a copied page are decoded", () => {
  const d = parsePasted("N 12. november\nInglise keel\nRead &#39;tall tales&#34;", T);
  expect(d[0].title).toBe("Read 'tall tales\"");
});

test("grade table: subjects with a failing mark become retake suggestions", () => {
  const g = parseGrades(GRADES_TABLE);
  expect(g).toEqual([
    { subject: "Mat 1", marks: ["2-"] },
    { subject: "Keemia", marks: ["1"] },
  ]);
});

test("grade summary view (marks on one line, teacher names stripped)", () => {
  const g = parseGrades(GRADES_SUMMARY);
  expect(g).toEqual([
    { subject: "Mat 1", marks: ["2-"] },
    { subject: "Keemia", marks: ["1"] },
  ]);
});

test("a homework list has no grade hints and a grade table has no tasks", () => {
  expect(parseGrades(sample)).toEqual([]);
  expect(parsePasted(GRADES_TABLE, T)).toEqual([]);
  expect(parsePasted(GRADES_SUMMARY, T)).toEqual([]);
});

describe("messages", () => {
  const tests: Assignment[] = [
    { id: "a1", kind: "test", subject: "Ajalugu", title: "Vanaaeg", due: "2026-11-12", minutes: 50, createdOn: T, source: "parent" },
  ];

  test("revision questions are attached to Thursday's history test", () => {
    const m = parseMessage(MSG_TEST, T, tests)!;
    expect(m.actions[0]).toEqual({ type: "attach", aid: "a1", label: "Ajalugu: kontrolltöö 2026-11-12" });
  });

  test("a notice becomes a reminder for tomorrow", () => {
    const m = parseMessage(MSG_NOTEBOOK, T, tests)!;
    expect(m.title).toBe("Teie eesti keele vihikud");
    expect(m.actions).toEqual([{ type: "reminder", due: "2026-11-11", subject: "Eesti keel", title: "Teie eesti keele vihikud" }]);
    expect(m.text).not.toMatch(/Sõnumit näevad/);
  });

  test("a retake time becomes a fixed appointment on the next Wednesday", () => {
    const m = parseMessage(MSG_RETAKE, T, tests)!;
    expect(m.actions[0]).toEqual({ type: "event", day: "2026-11-11", time: "16:00", title: "Keemia järeltöö" });
  });
});

test("phone-browser copy: tasks end at \"-Np\", tests and reminders are recognised", () => {
  const d = parsePasted(HOMEWORK_PHONE, "2026-11-10");
  const by = (s: string) => d.filter((x) => x.subject === s);
  expect(d.map((x) => x.subject)).toEqual([
    "Inglise keel I", "Eesti keel I", "Eesti keel I", "Mat 1", "Ajalugu", "Muusikaajalugu", "Muusikaajalugu",
  ]);
  const [read, bring] = by("Eesti keel I");
  expect(read.minutes).toBe(60);
  expect(read.title).toBe("Loe kodus süvenemisega läbi abimaterjal (õpikutekst ,,Sõnaliigid\")");
  expect(read.note).toContain("Tera: Õigekeel");
  expect(bring.minutes).toBe(5);
  expect(bring.title).toBe("Võta tundi kaasa siniste kaantega harjutustik");
  const mat = by("Mat 1")[0];
  expect(mat.kind).toBe("test");
  expect(mat.title).toBe("Avaldiste lihtsustamine");
  expect(mat.due).toBe("2026-11-11");
  expect(by("Ajalugu")[0].kind).toBe("test");
  const [kt, rev] = by("Muusikaajalugu");
  expect(kt.kind).toBe("test");
  expect(rev.minutes).toBe(90);
  expect(d.every((x) => !/-\d+p$/.test(x.title))).toBe(true);
});

test("grade summary copied on the phone: teachers on their own line (even one named August), AR is a pass", () => {
  expect(parseGrades(GRADES_SUMMARY_PHONE)).toEqual([
    { subject: "Eesti keel I", marks: ["2"] },
    { subject: "Mat 1", marks: ["2"] },
    { subject: "Füüsika 1", marks: ["2"] },
  ]);
});
