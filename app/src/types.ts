import type { Day } from "./dates";

/**
 * What a task is. Everything comes from the school (e-diary, later) or the parent.
 * TASA never makes up practice problems or solves anything.
 */
export type Kind =
  | "homework" // kodune töö with a due date
  | "project" // bigger piece of work, split into many steps
  | "test" // kontrolltöö: prep steps in the 7 days before
  | "book" // read pages from..to by a date: exact pages per day
  | "retake"; // järeltöö: practise the problems that went wrong

export type Source = "sample" | "parent" | "ediary";

export interface Assignment {
  id: string;
  kind: Kind;
  subject: string;
  title: string;
  /** For homework/project/book: hand-in day. For test/retake: the day of the test. */
  due: Day;
  /** Total work time in minutes (homework/project/test prep). */
  minutes: number;
  createdOn: Day;
  source: Source;
  note?: string;
  /** book: pages to read */
  pageFrom?: number;
  pageTo?: number;
  /** retake: problem numbers that were wrong (read from the marked test, confirmed by the parent) */
  wrong?: number[];
}

/** A fixed, required thing at a set time (e.g. a weekly maths consultation). */
export interface FixedEvent {
  id: string;
  title: string;
  /** First (or only) day */
  day: Day;
  time: string; // "15:00–15:45"
  weekly: boolean;
}

export interface RewardConfig {
  on: boolean;
  name: string; // e.g. "Ekraaniaeg", "Filmiõhtu vanemaga", "Pereretk" (never money)
  unit: string; // e.g. "minutit", "tähte"
  per: "step" | "day";
  amount: number;
  /** 0 = no goal */
  goal: number;
  /** extra for a whole week (Mon–Sun) done on the day, 0 = none */
  bonus: number;
  /** earnings count from this day (reset when the reward itself changes) */
  since: Day;
}

export interface Payout {
  day: Day;
  amount: number;
  note: string;
}

export interface AppState {
  version: 1;
  setupDone: boolean;
  child: { name: string; grade: string };
  /** sha-256 of salt + PIN */
  pinHash: string;
  pinSalt: string;
  /** daily study-time budget in minutes */
  budget: number;
  assignments: Assignment[];
  events: FixedEvent[];
  /** stepId -> the day it was ticked */
  done: Record<string, Day>;
  /** stepId -> true when the parent excused it (e.g. illness) */
  excused: Record<string, true>;
  /** The plan for a day, frozen when that day starts, so "done on the day" is fair. */
  days: Record<Day, string[]>;
  reward: RewardConfig;
  payouts: Payout[];
  seq: number;
  /** Daily reminder to add the next day's homework (Stuudium: teachers can't add after 17:00). */
  reminder?: { on: boolean; hour: number; asked?: boolean };
  /** Subjects that need a järeltöö whose date isn't known yet (no grade is stored). */
  pendingRetakes?: { id: string; subject: string; since: Day }[];
}

export interface Step {
  id: string;
  aid: string;
  kind: Kind;
  subject: string;
  title: string;
  minutes: number;
  note: string;
  index: number;
  total: number;
}

export interface PlannedStep extends Step {
  day: Day;
  due: Day;
}
