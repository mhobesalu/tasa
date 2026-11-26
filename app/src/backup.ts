// Backup file: the parent saves all TASA data to one file and keeps it where they like
// (Files, their own cloud, e-mail to themselves). TASA itself never uploads it anywhere.
// Restoring on a new phone: set TASA up (new PIN), then "Taasta failist" in the parent view.
//
// Left out on purpose:
// - the PIN (hash and salt): a 4-digit PIN is easy to guess from its hash; the phone keeps its own PIN
// - the student's moods: they are only for the student and never shown to the parent
// - the student's "let my parent know" note and when they were asked: it belongs to this phone only

import type { Day } from "./dates";
import { emptyState } from "./state";
import type { AppState } from "./types";

const FORMAT = 1;
const MARK = "tasa-varukoopia";

export interface BackupFile {
  app: typeof MARK;
  format: number;
  appVersion: string;
  savedOn: Day;
  data: Omit<AppState, "pinHash" | "pinSalt" | "moods" | "moodAsked" | "moodNote">;
}

export function makeBackup(s: AppState, savedOn: Day, appVersion: string): string {
  const { pinHash, pinSalt, moods, moodAsked, moodNote, ...data } = s;
  const file: BackupFile = { app: MARK, format: FORMAT, appVersion, savedOn, data };
  return JSON.stringify(file, null, 1);
}

/** File name, e.g. "TASA-varukoopia-Mia-2026-11-23.json" */
export function backupName(s: AppState, savedOn: Day): string {
  const first = (s.child.name.split(/\s+/)[0] ?? "").normalize("NFD").replace(/[^\w-]/g, "");
  return `TASA-varukoopia${first ? `-${first}` : ""}-${savedOn}.json`;
}

export type Restored = { ok: true; state: AppState; savedOn: Day; tasks: number } | { ok: false; why: string };

/**
 * Read a backup file. The current phone keeps its own PIN and the student's moods (and mood note);
 * everything else comes from the file.
 */
export function readBackup(text: string, current: AppState, t: Day): Restored {
  let f: Partial<BackupFile>;
  try {
    f = JSON.parse(text);
  } catch {
    return { ok: false, why: "See ei ole TASA varukoopia fail." };
  }
  if (!f || f.app !== MARK || !f.data || typeof f.data !== "object") return { ok: false, why: "See ei ole TASA varukoopia fail." };
  if ((f.format ?? 0) > FORMAT) return { ok: false, why: "Varukoopia on tehtud uuema TASA versiooniga. Uuenda rakendust ja proovi uuesti." };
  const d = f.data as Partial<AppState>;
  if (!Array.isArray(d.assignments) || !d.child || typeof d.child.name !== "string") return { ok: false, why: "Varukoopia fail on vigane." };
  const state: AppState = {
    ...emptyState(t),
    ...d,
    version: 1,
    setupDone: true,
    pinHash: current.pinHash,
    pinSalt: current.pinSalt,
    moods: current.moods,
    moodAsked: current.moodAsked,
    moodNote: current.moodNote,
  } as AppState;
  return { ok: true, state, savedOn: (f.savedOn as Day) ?? t, tasks: d.assignments.length };
}
