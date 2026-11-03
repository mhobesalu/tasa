import { addDays, diffDays, mondayOf, type Day } from "./dates";
import { buildPlan, stepsOf, type Plan } from "./planner";
import type { AppState, Step } from "./types";

export function stepIndex(s: Pick<AppState, "assignments">): Record<string, Step & { due: Day }> {
  const out: Record<string, Step & { due: Day }> = {};
  for (const a of s.assignments) for (const st of stepsOf(a)) out[st.id] = { ...st, due: a.due };
  return out;
}

/**
 * Freeze (or extend) today's list. Called when a day starts and after the parent changes something.
 * Never called after a tick, so finishing steps can't pull tomorrow's work into today.
 */
export function freezeToday(s: AppState, t: Day, plan?: Plan): AppState {
  const p = plan ?? buildPlan(s, t);
  const idx = stepIndex(s);
  const existing = (s.days[t] ?? []).filter((id) => idx[id]);
  const add = (p.byDay[t] ?? []).map((x) => x.id).filter((id) => !existing.includes(id));
  const next = [...existing, ...add];
  const same = next.length === (s.days[t] ?? []).length && next.every((id, i) => s.days[t]?.[i] === id);
  return same ? s : { ...s, days: { ...s.days, [t]: next } };
}

export interface TodayItem extends Step {
  due: Day;
  done: boolean;
  excused: boolean;
  /** was planned for an earlier day and not done then */
  leftover: boolean;
}

export function dayItems(s: AppState, day: Day): TodayItem[] {
  const idx = stepIndex(s);
  const earlier = new Set<string>();
  for (const [d, ids] of Object.entries(s.days)) if (d < day) ids.forEach((id) => earlier.add(id));
  return (s.days[day] ?? [])
    .filter((id) => idx[id])
    .map((id) => ({
      ...idx[id],
      done: s.done[id] === day,
      excused: !!s.excused[id],
      leftover: earlier.has(id),
    }))
    .filter((x) => !(s.done[x.id] && s.done[x.id] !== day)); // done another day: not part of this day any more
}

/** A day counts only if everything planned for it was ticked ON that day. */
export function dayFull(s: AppState, day: Day): boolean {
  const ids = (s.days[day] ?? []).filter((id) => !s.excused[id]);
  const idx = stepIndex(s);
  const live = ids.filter((id) => idx[id]);
  return live.length > 0 && live.every((id) => s.done[id] === day);
}

export function dayHasWork(s: AppState, day: Day): boolean {
  return (s.days[day] ?? []).some((id) => !s.excused[id]);
}

export interface RewardSummary {
  earned: number;
  paid: number;
  balance: number;
  today: number;
  fullDays: number;
  bonusWeeks: number;
}

export function rewardSummary(s: AppState, t: Day): RewardSummary {
  const r = s.reward;
  const since = r.since;
  let earned = 0;
  let todayEarned = 0;
  let fullDays = 0;
  if (r.per === "step") {
    for (const d of Object.values(s.done)) {
      if (d >= since && d <= t) {
        earned += r.amount;
        if (d === t) todayEarned += r.amount;
      }
    }
  }
  for (const d of Object.keys(s.days)) {
    if (d < since || d > t) continue;
    if (dayFull(s, d)) {
      fullDays++;
      if (r.per === "day") {
        earned += r.amount;
        if (d === t) todayEarned += r.amount;
      }
    }
  }
  // Week bonus: every day Mon–Sun that had steps was finished on that day, and at least one had steps.
  let bonusWeeks = 0;
  if (r.bonus > 0) {
    for (let m = mondayOf(since); diffDays(m, t) >= 0; m = addDays(m, 7)) {
      if (m < since) continue;
      const sun = addDays(m, 6);
      if (sun > t) break;
      let any = false;
      let ok = true;
      for (let i = 0; i < 7; i++) {
        const d = addDays(m, i);
        if (!dayHasWork(s, d)) continue;
        any = true;
        if (!dayFull(s, d)) ok = false;
      }
      if (any && ok) bonusWeeks++;
    }
    earned += bonusWeeks * r.bonus;
    if (addDays(mondayOf(t), 6) === t && bonusWeeks && weekOk(s, mondayOf(t))) todayEarned += r.bonus;
  }
  const paid = s.payouts.filter((p) => p.day >= since).reduce((a, p) => a + p.amount, 0);
  return { earned, paid, balance: earned - paid, today: todayEarned, fullDays, bonusWeeks };
}

function weekOk(s: AppState, m: Day) {
  let any = false;
  for (let i = 0; i < 7; i++) {
    const d = addDays(m, i);
    if (!dayHasWork(s, d)) continue;
    any = true;
    if (!dayFull(s, d)) return false;
  }
  return any;
}

/** Week (Mon–Sun containing t) so far: still possible to get the bonus? */
export function weekStillPossible(s: AppState, t: Day): boolean {
  const m = mondayOf(t);
  for (let d = m; d < t; d = addDays(d, 1)) if (dayHasWork(s, d) && !dayFull(s, d)) return false;
  return true;
}

export interface WeekStats {
  stepsDone: number;
  stepsPlanned: number;
  minutes: number;
  daysOpened: number;
  missedDeadlines: number;
}

export function weekStats(s: AppState, t: Day): WeekStats {
  const m = mondayOf(t);
  const idx = stepIndex(s);
  let stepsDone = 0;
  let minutes = 0;
  for (const [id, d] of Object.entries(s.done)) {
    if (d >= m && d <= t && idx[id]) {
      stepsDone++;
      minutes += idx[id].minutes;
    }
  }
  const planned = new Set<string>();
  let daysOpened = 0;
  for (let d = m; d <= t; d = addDays(d, 1)) {
    if (s.days[d]) {
      daysOpened++;
      s.days[d].filter((id) => !s.excused[id] && idx[id]).forEach((id) => planned.add(id));
    }
  }
  let missed = 0;
  for (const a of s.assignments) {
    if (a.due < m || a.due >= t || a.kind === "test" || a.kind === "retake") continue;
    const st = stepsOf(a).filter((x) => !s.excused[x.id]);
    if (st.some((x) => !s.done[x.id] || s.done[x.id] > a.due)) missed++;
  }
  return { stepsDone, stepsPlanned: Math.max(planned.size, stepsDone), minutes, daysOpened, missedDeadlines: missed };
}
