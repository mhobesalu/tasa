import { addDays, type Day } from "./dates";
import type { Assignment, FixedEvent } from "./types";

/**
 * Made-up homework so a family can try TASA before the e-diary connection exists.
 * Everything here is invented; it's the same kind of week as the website demo.
 */
export function sampleData(t: Day): { assignments: Assignment[]; events: FixedEvent[] } {
  const a = (
    id: string,
    kind: Assignment["kind"],
    subject: string,
    title: string,
    dueIn: number,
    minutes: number,
    extra: Partial<Assignment> = {},
  ): Assignment => ({
    id: `s-${id}`,
    kind,
    subject,
    title,
    due: addDays(t, dueIn),
    minutes,
    createdOn: t,
    source: "sample",
    ...extra,
  });
  return {
    assignments: [
      a("mat", "homework", "Matemaatika", "töölehe ülesanded 1–8", 1, 50, {
        note: "Tööleht on vihikus. Tee ülesanded järjest ja kontrolli vastused.",
      }),
      a("ing", "homework", "Inglise keel", "sõnad lk 34", 2, 15, {
        note: "Õpi sõnad kaartidega. Ütle iga sõna kõva häälega.",
      }),
      a("kee", "retake", "Keemia", "järeltöö", 3, 0, { wrong: [2, 5, 7, 8] }),
      a("fys", "test", "Füüsika", "kontrolltöö: rõhk", 6, 100, {
        note: "Loe üle konspekt „Rõhk“ ja tee õpikust tunnis antud näidisülesanded.",
      }),
      a("aja", "project", "Ajalugu", "referaat", 9, 125, {
        note: "Õpetaja andis teemad tunnis. Iga samm on üks väike osa: teema, allikad, mustand, parandamine.",
      }),
      a("eek", "book", "Eesti keel", "„Kevade“", 10, 0, { pageFrom: 41, pageTo: 180 }),
    ],
    events: [{ id: "s-kons", title: "Matemaatika konsultatsioon", day: t, time: "15:00–15:45", weekly: true }],
  };
}
