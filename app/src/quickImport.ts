// One-tap import: read pasted or recognised e-diary text and decide what to add,
// without a checklist. Past-due items and items already in the plan are skipped;
// the user can undo the whole batch.

import type { Day } from "./dates";
import { isDuplicate, parseGrades, parseMessage, parseMissed, parsePasted, type Draft, type ParsedMessage, type RetakeHint } from "./importText";
import type { Assignment } from "./types";

export interface QuickResult {
  add: Draft[];
  /** found but not added: already planned or already past */
  skipped: number;
  message: ParsedMessage | null;
  grades: RetakeHint[];
  /** works marked "Tegemata" (handled in the parent view) */
  missed: number;
}

export function planImport(text: string, day: Day, assignments: Assignment[]): QuickResult {
  const drafts = parsePasted(text, day);
  const grades = parseGrades(text);
  const add: Draft[] = [];
  let skipped = 0;
  for (const d of drafts) {
    // also skip repeats inside the same paste (e.g. two overlapping screenshots)
    const planned = [...assignments, ...add.map((a) => ({ ...a, id: a.key, createdOn: day, source: "parent" as const }))];
    if (d.due <= day || isDuplicate(d, planned)) skipped++;
    else add.push(d);
  }
  const message = !drafts.length && !grades.length ? parseMessage(text, day, assignments) : null;
  return { add, skipped, message, grades, missed: parseMissed(text, day).length };
}
