import { GRADES_SUMMARY, GRADES_TABLE, HOMEWORK } from "../testdata/stuudium";
import { parseDayHeader, parseGrades, parsePasted, parseSubjectLine } from "../importText";

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
  expect(d[1].title).toBe("Loe kodus läbi õpikutekst ,,Sõnaliigid\" ja tee tunnis…");
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
    { subject: "Filmiõpetus", marks: ["AR"] },
  ]);
});

test("grade summary view (marks on one line, teacher names stripped)", () => {
  const g = parseGrades(GRADES_SUMMARY);
  expect(g).toEqual([
    { subject: "Mat 1", marks: ["2-"] },
    { subject: "Keemia", marks: ["1"] },
    { subject: "Filmiõpetus", marks: ["AR"] },
  ]);
});

test("a homework list has no grade hints and a grade table has no tasks", () => {
  expect(parseGrades(sample)).toEqual([]);
  expect(parsePasted(GRADES_TABLE, T)).toEqual([]);
  expect(parsePasted(GRADES_SUMMARY, T)).toEqual([]);
});
