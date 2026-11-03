import type { Day } from "./dates";
import type { AppState } from "./types";

export function emptyState(t: Day): AppState {
  return {
    version: 1,
    setupDone: false,
    child: { name: "", grade: "" },
    pinHash: "",
    pinSalt: "",
    budget: 100,
    assignments: [],
    events: [],
    done: {},
    excused: {},
    days: {},
    reward: { on: true, name: "Ekraaniaeg", unit: "minutit", per: "step", amount: 10, goal: 0, bonus: 0, since: t },
    payouts: [],
    seq: 0,
  };
}
