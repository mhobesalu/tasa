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

// made-up school grid in the style of a printed timetable photographed on a phone:
// misread day headings, teachers, rooms, groups and canteen lines in the cells
test("printed grid with teachers, rooms and misread headings", () => {
  const X = [160, 315, 470, 620, 775];
  const c = (d: number, y: number, text: string) => P(text, X[d], y);
  const pieces = [
    P("2. November", 460, 175), P("From Mia", 460, 320), P("10X KUNST-MUUSIKA", 450, 427), P("II PERIOOD", 450, 451),
    P("Esmaspääev", 160, 470), P("Teisipäev", 315, 470), P("Kolmapãev", 470, 470), P("Neljapäev", 620, 470), P("Reede", 775, 470),
    P("8:15", 65, 495), P("9:00", 65, 585),
    c(0, 591, "FÜÜSIKA"), c(0, 621, "MARI MAASIKAS"), c(0, 651, "V212"),
    c(1, 591, "MATEMAATIKA"), c(1, 621, "L1 V136"), c(1, 651, "TAMM"),
    c(2, 561, "ERIALA"), c(2, 591, "KUNST"), c(2, 621, "KINO"),
    c(4, 651, "KEEMIA"), c(4, 681, "JAAN JÕGI"), c(4, 711, "V136"),
    c(1, 773, "INGLISE KEEL"), c(1, 803, "G1 V133"), c(1, 865, "Anna Example"),
    c(2, 773, "B-KEEL VK PK K5 /OK"), c(2, 803, "RO O002 / V133"),
    c(3, 773, "AJALUGU"), c(3, 803, "PEETER PÕLD"), c(3, 833, "OKASROOSIKESE II K"),
    c(4, 803, "FÜÜsiKA"),
    c(1, 895, "KJT V213"), c(1, 925, "KASK / KUUSK"),
    c(3, 925, "OKASR SÖÖGISAAL"), c(2, 955, "OLEVIMÄE SÖÖGISAAL"),
    c(1, 955, "KIRJANDUS"), c(2, 985, "EESTI KEEL 1"), c(2, 1015, "EK1 O108"),
    c(0, 1075, "VENE KELDER SAAL 1"),
    c(0, 1135, "KRISTLIKU MAAILMAPILDI"), c(0, 1165, "ALUSED"),
    c(4, 1015, "KEHALINE KASVATUS"), c(3, 1195, "LAULMINE"), c(3, 1345, "RIIGIKAITSE"),
    P("KAMMERKOOR G3 O002", 400, 1410),
  ];
  const r = readTimetable(pieces, ["Matemaatika", "Pärimus ja kirjandus"]);
  const names = r.map((x) => x.name);
  expect(names).toEqual(expect.arrayContaining(["Matemaatika", "Pärimus ja kirjandus", "Füüsika", "Keemia", "Ajalugu", "Eesti keel 1", "KJT", "Laulmine", "Riigikaitse", "Kehaline kasvatus", "Inglise keel", "B-keel", "Kammerkoor", "Kristliku maailmapildi alused"]));
  for (const bad of ["Mari Maasikas", "Esmaspääev", "Kolmapãev", "Olevimäe söögisaal", "Anna Example", "V212", "Kask / kuusk", "From Mia"])
    expect(names).not.toContain(bad);
  expect(r.find((x) => x.name === "Füüsika")?.days).toEqual([0, 4]);
  expect(r.find((x) => x.name === "Matemaatika")?.days).toEqual([1]);
  expect(r.find((x) => x.name === "Pärimus ja kirjandus")).toMatchObject({ days: [1], known: true });
});
