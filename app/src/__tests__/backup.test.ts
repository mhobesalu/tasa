import { backupName, makeBackup, readBackup } from "../backup";
import { emptyState } from "../state";
import type { AppState } from "../types";

const T = "2026-11-23";
const old: AppState = {
  ...emptyState(T),
  setupDone: true,
  child: { name: "Mia-Liisa Tamm", grade: "7.b" },
  pinHash: "oldhash",
  pinSalt: "oldsalt",
  assignments: [{ id: "a1", kind: "homework", subject: "Ajalugu", title: "Loe lk 30", due: "2026-11-25", minutes: 25, createdOn: T, source: "parent", links: ["https://opiq.ee/kit/1"] }],
  moods: { [T]: 3 },
  seq: 1,
};

test("the file has the plan but not the PIN or the student's moods", () => {
  const text = makeBackup(old, T, "0.3.0");
  expect(text).toContain("Loe lk 30");
  expect(text).not.toContain("oldhash");
  expect(text).not.toContain("oldsalt");
  expect(text).not.toContain("moods");
  expect(backupName(old, T)).toBe("TASA-varukoopia-Mia-Liisa-2026-11-23.json");
});

test("restoring on a new phone keeps that phone's PIN and moods", () => {
  const fresh: AppState = { ...emptyState(T), setupDone: true, child: { name: "Mia", grade: "" }, pinHash: "new", pinSalt: "nsalt", moods: { "2026-11-24": 1 } };
  const r = readBackup(makeBackup(old, T, "0.3.0"), fresh, "2026-11-24");
  if (!r.ok) throw new Error(r.why);
  expect(r.tasks).toBe(1);
  expect(r.state.assignments[0].links).toEqual(["https://opiq.ee/kit/1"]);
  expect(r.state.child.name).toBe("Mia-Liisa Tamm");
  expect(r.state.pinHash).toBe("new");
  expect(r.state.pinSalt).toBe("nsalt");
  expect(r.state.moods).toEqual({ "2026-11-24": 1 });
});

test("other files are refused", () => {
  expect(readBackup("hello", old, T)).toEqual({ ok: false, why: "See ei ole TASA varukoopia fail." });
  expect(readBackup('{"a":1}', old, T).ok).toBe(false);
  expect(readBackup(JSON.stringify({ app: "tasa-varukoopia", format: 99, data: {} }), old, T)).toMatchObject({ ok: false });
});
