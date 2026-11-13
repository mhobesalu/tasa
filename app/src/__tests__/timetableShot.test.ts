import { lessonName, matchKnown, readTimetable, weekdayOf, type Piece } from "../timetableShot";

const P = (text: string, x: number, y: number, shot = 0): Piece => ({ text, x, y, shot });

test("weekday headings", () => {
  expect(weekdayOf("E")).toBe(0);
  expect(weekdayOf("R 20.11")).toBe(4);
  expect(weekdayOf("Kolmapäev, 18. november")).toBe(2);
  expect(weekdayOf("Keemia")).toBe(-1);
});

test("lesson text loses number, time, room and teacher", () => {
  expect(lessonName("1. Matemaatika")).toBe("Matemaatika");
  expect(lessonName("08:15–09:00 Eesti keel 205")).toBe("Eesti keel");
  expect(lessonName("Bioloogia ruum 112")).toBe("Bioloogia");
  expect(lessonName("Ajalugu M. Tamm")).toBe("Ajalugu");
});

test("short forms match the subject in TASA", () => {
  expect(matchKnown("Mat", ["Matemaatika", "Muusika"])).toBe("Matemaatika");
  expect(matchKnown("inglise keel", ["Inglise keel"])).toBe("Inglise keel");
  expect(matchKnown("Ke", ["Keemia"])).toBe(null);
});

// made-up grid: day columns across the top
test("grid timetable", () => {
  const pieces = [
    P("E", 100, 50), P("T", 200, 50), P("K", 300, 50), P("N", 400, 50), P("R", 500, 50),
    P("1. Mat", 100, 120), P("Eesti keel", 200, 120), P("Mat", 300, 120), P("Keemia", 400, 120), P("Mat", 500, 120),
    P("Ajalugu", 105, 180), P("Kehaline kasvatus", 210, 180), P("Ajalugu", 470, 180),
  ];
  const r = readTimetable(pieces, ["Matemaatika", "Ajalugu", "Keemia"]);
  expect(r.find((x) => x.name === "Matemaatika")?.days).toEqual([0, 2, 4]);
  expect(r.find((x) => x.name === "Ajalugu")?.days).toEqual([0, 4]);
  expect(r.find((x) => x.name === "Keemia")).toMatchObject({ days: [3], known: true });
  expect(r.find((x) => x.name === "Kehaline kasvatus")).toMatchObject({ days: [1], known: false });
});

// made-up list: day headings with lessons under them, going on in a second screenshot
test("list timetable over two screenshots", () => {
  const pieces = [
    P("Esmaspäev, 16. november", 150, 40), P("1. Matemaatika", 120, 90), P("2. Füüsika", 120, 130),
    P("Teisipäev, 17. november", 150, 200), P("1. Matemaatika", 120, 250),
    P("3. Keemia", 120, 40, 1), P("Reede, 20. november", 150, 120, 1), P("Füüsika", 120, 170, 1),
  ];
  const r = readTimetable(pieces, ["Matemaatika"]);
  expect(r.find((x) => x.name === "Matemaatika")?.days).toEqual([0, 1]);
  expect(r.find((x) => x.name === "Füüsika")?.days).toEqual([0, 4]);
  expect(r.find((x) => x.name === "Keemia")?.days).toEqual([1]);
});
