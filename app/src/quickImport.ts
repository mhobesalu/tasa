// One-tap import: read pasted or recognised e-diary text and decide what to add,
// without a checklist. Past-due items and items already in the plan are skipped;
// the user can undo the whole batch.

import type { Day } from "./dates";
import { isDuplicate, parseGrades, parseMessage, parseMissed, parsePasted, type Draft, type ParsedMessage, type RetakeHint } from "./importText";
import { parseReview } from "./planner";
import type { Assignment } from "./types";

export interface QuickResult {
  add: Draft[];
  /** found but not added: already planned or already past */
  skipped: number;
  message: ParsedMessage | null;
  grades: RetakeHint[];
  /** works marked "Tegemata" (handled in the parent view) */
  missed: number;
  /** a numbered worksheet (kordamisküsimused / -ülesanded) to add to a kontrolltöö */
  review: string[];
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
  const sheet = !drafts.length && !grades.length && text.split(/\n/).filter((l) => /^\s*\d{1,3}\s*[.)]\s*\S/.test(l) || /^\s*\d{1,3}\s*[.)]\s*$/.test(l)).length >= 3;
  let review = sheet ? parseReview(text) : [];
  if (!review.length && !drafts.length && !grades.length) {
    // an answer sheet whose numbers were lost in copying: topic lines with notes under them
    const n = text.split(/\n/).filter((l) => l.trim()).length;
    const r = parseReview(text);
    if (n >= 15 && r.length >= 3 && r.length <= n / 2.5) review = r;
  }
  const message = !drafts.length && !grades.length && !review.length ? parseMessage(text, day, assignments) : null;
  return { add, skipped, message, grades, missed: parseMissed(text, day).length, review };
}
