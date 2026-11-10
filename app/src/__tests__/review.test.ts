import { parseReview, stepsOf } from "../planner";
import type { Assignment } from "../types";

const test = (over: Partial<Assignment>): Assignment => ({
  id: "t1", kind: "test", subject: "Ajalugu", title: "kontrolltöö", due: "2026-11-20",
  minutes: 75, createdOn: "2026-11-10", source: "parent", ...over,
});

describe("kordamisküsimused", () => {
  it("reads numbers and ranges", () => {
    expect(parseReview("1-5, 8")).toEqual(["1", "2", "3", "4", "5", "8"]);
    expect(parseReview("1–3 ja 7")).toEqual(["1", "2", "3", "7"]);
    expect(parseReview("4 5 6")).toEqual(["4", "5", "6"]);
  });
  it("reads one question per line", () => {
    expect(parseReview("1. Mis on demokraatia?\n2. Kes oli Perikles?\n\n- Too näide")).toEqual([
      "Mis on demokraatia?", "Kes oli Perikles?", "Too näide",
    ]);
  });
  it("tells each review step which problems to do", () => {
    const s = stepsOf(test({ review: parseReview("1-12") }));
    expect(s).toHaveLength(3);
    expect(s.map((x) => x.title)).toEqual([
      "Ajalugu: kontrolltööks kordamine 1/3, nr 1–4",
      "Ajalugu: kontrolltööks kordamine 2/3, nr 5–8",
      "Ajalugu: kontrolltööks kordamine 3/3, nr 9–12",
    ]);
  });
  it("lists questions in the step note and pads extra steps", () => {
    const s = stepsOf(test({ review: ["Mis on demokraatia?", "Kes oli Perikles?"], note: "Kordamisleht" }));
    expect(s).toHaveLength(3);
    expect(s[0].title).toBe("Ajalugu: kontrolltööks kordamine 1/3, 1 küsimus");
    expect(s[0].note).toBe("Kordamisleht\n• Mis on demokraatia?");
    expect(s[2].title).toContain("kõik uuesti üle");
  });
  it("keeps plain test steps without a list", () => {
    expect(stepsOf(test({}))[0].title).toBe("Ajalugu: kontrolltööks kordamine 1/3");
  });
});

describe("järeltöö day from the student", () => {
  it("plans general review when the wrong problems aren't known", () => {
    const s = stepsOf(test({ kind: "retake", title: "järeltöö", minutes: 0, wrong: [] }));
    expect(s).toHaveLength(2);
    expect(s[0].title).toBe("Ajalugu: järeltööks kordamine 1/2");
  });
});

describe("kordamisküsimused from a screenshot", () => {
  it("joins wrapped lines and drops the heading", () => {
    const ocr = "Kordamisküsimused\n1. Mis on demokraatia ja kus see\ntekkis?\n2) Kes oli Perikles?\n––– pilt –––\n3. Nimeta kolm\nAteena ehitist.";
    expect(parseReview(ocr)).toEqual([
      "Mis on demokraatia ja kus see tekkis?",
      "Kes oli Perikles?",
      "Nimeta kolm Ateena ehitist.",
    ]);
  });
  it("joins wrapped lines without numbers", () => {
    expect(parseReview("Mis on rakk ja millest see\nkoosneb?\nMis on DNA?")).toEqual(["Mis on rakk ja millest see koosneb?", "Mis on DNA?"]);
  });
});

describe("photo of a maths worksheet", () => {
  // made-up text in the shape the text reader returns for a printed sheet with formulas
  const OCR = [
    "II Algebraliste avaldiste lihtsustamine",
    "32. Lihtsusta avaldis.",
    "1+ a(a-2c)+c² (1+ c",
    "33. Lihtsusta avaldis.",
    "(x+2)²-x² 3",
    "34. Lihtsusta avaldis.",
    "x+1 1 x 2x",
    "35.",
    "Lihtsusta avaldis.",
    "1-2a²",
    "36. Lihtsusta avaldis.",
    "√a+√b-1",
    "2.",
    "12",
  ].join("\n");
  it("keeps the task numbers, not the formulas", () => {
    expect(parseReview(OCR)).toEqual(["32", "33", "34", "35", "36"]);
  });
  it("plans about four problems per step", () => {
    const s = stepsOf(test({ minutes: 50, review: Array.from({ length: 18 }, (_, i) => String(32 + i)) }));
    expect(s).toHaveLength(5);
    expect(s[0].title).toBe("Ajalugu: kontrolltööks kordamine 1/5, nr 32–34");
  });
});

describe("reading homework", () => {
  const hw = (over: Partial<Assignment>): Assignment => ({
    id: "h1", kind: "homework", subject: "Kirjandus", title: "Loe raamat „Kevade“", due: "2026-11-17",
    minutes: 60, createdOn: "2026-11-10", source: "ediary", ...over,
  });
  it("reads a little every day until it's due", () => {
    const s = stepsOf(hw({}));
    expect(s).toHaveLength(7);
    expect(s[0].title).toBe("Kirjandus: Loe raamat „Kevade“, loe edasi 1/7");
    expect(s[0].minutes).toBe(10);
  });
  it("keeps a reading task due tomorrow as it is", () => {
    expect(stepsOf(hw({ due: "2026-11-11", minutes: 25 }))).toHaveLength(1);
  });
});

describe("reading with pages", () => {
  it("spreads exact pages per day once the pages are known", () => {
    const s = stepsOf({ id: "b1", kind: "book", subject: "Kirjandus", title: "Loe raamat „Kevade“", due: "2026-11-17", minutes: 60,
      createdOn: "2026-11-10", source: "ediary", pageFrom: 41, pageTo: 110 });
    expect(s).toHaveLength(7);
    expect(s[0].title).toBe("Kirjandus: Loe raamat „Kevade“, loe lk 41–50");
  });
});
