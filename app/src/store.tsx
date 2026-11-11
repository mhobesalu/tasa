import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { addDays, today, type Day } from "./dates";
import { freezeToday } from "./logic";
import { buildPlan, type Plan } from "./planner";
import { sampleData } from "./sample";
import { emptyState } from "./state";
import { matchSubject, renameSubject, tidySubjects } from "./subjects";
import type { AppState, Assignment, FixedEvent, RewardConfig } from "./types";

const KEY = "tasa:state:v1";

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

interface Ctx {
  state: AppState;
  day: Day;
  plan: Plan;
  /** parent changes: re-freeze today's list afterwards */
  parentUpdate: (fn: (s: AppState) => AppState) => void;
  tick: (stepId: string) => "done" | "undone";
  finishSetup: (o: { name: string; grade: string; pin: string; sample: boolean }) => Promise<void>;
  checkPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  addAssignment: (a: Omit<Assignment, "id" | "createdOn" | "source">) => void;
  /** Add text (e.g. a teacher's message) to an assignment's note. */
  attachNote: (id: string, text: string) => void;
  removeAssignment: (id: string) => void;
  /** Add several at once (one undo step). Returns the new ids. */
  addMany: (list: Omit<Assignment, "id" | "createdOn" | "source">[]) => string[];
  removeMany: (ids: string[]) => void;
  setReminder: (r: NonNullable<AppState["reminder"]>) => void;
  /** Remember that a subject needs a järeltöö; the date comes later. Adds a step "agree the date". */
  savePendingRetake: (subject: string) => void;
  removePendingRetake: (id: string) => void;
  /** Fix a misread subject name everywhere, or merge it into another subject. */
  renameSubject: (from: string, to: string) => void;
  /** the student got the retake day from the teacher */
  studentRetake: (subject: string, due: Day) => void;
  setReview: (id: string, review: string[], note?: string) => void;
  /** a reading task: from which page to which; it is then planned as exact pages per day */
  setPages: (id: string, from: number, to: number) => void;
  addEvent: (e: Omit<FixedEvent, "id">) => void;
  removeEvent: (id: string) => void;
  toggleExcuse: (stepId: string) => void;
  saveReward: (r: Omit<RewardConfig, "since">) => void;
  pay: (amount: number, note: string) => void;
  wipe: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function StoreProvider({ children, onReady }: { children: React.ReactNode; onReady?: () => void }) {
  const [state, setState] = useState<AppState | null>(null);
  const [day, setDay] = useState<Day>(today());
  const loaded = useRef(false);

  // load
  useEffect(() => {
    (async () => {
      let s: AppState = emptyState(today());
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) s = { ...s, ...(JSON.parse(raw) as AppState) };
      } catch {}
      const t = today();
      s = tidySubjects(s);
      if (s.setupDone) s = freezeToday(s, t);
      loaded.current = true;
      setDay(t);
      setState(s);
      onReady?.();
    })();
  }, [onReady]);

  // save
  useEffect(() => {
    if (!state || !loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  // new day while the app was in the background
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (st) => {
      if (st !== "active") return;
      const t = today();
      setDay(t);
      setState((s) => (s && s.setupDone ? freezeToday(s, t) : s));
    });
    const iv = setInterval(() => {
      const t = today();
      setDay((d) => {
        if (d === t) return d;
        setState((s) => (s && s.setupDone ? freezeToday(s, t) : s));
        return t;
      });
    }, 60_000);
    return () => {
      sub.remove();
      clearInterval(iv);
    };
  }, []);

  const plan = useMemo(() => (state ? buildPlan(state, day) : { byDay: {}, all: {} }), [state, day]);

  const parentUpdate = useCallback(
    (fn: (s: AppState) => AppState) => setState((s) => (s ? freezeToday(fn(s), day) : s)),
    [day],
  );

  const tickRef = useRef<"done" | "undone">("done");
  const tick = useCallback(
    (id: string) => {
      const wasDone = state?.done[id] === day;
      tickRef.current = wasDone ? "undone" : "done";
      setState((s) => {
        if (!s || s.excused[id]) return s;
        const done = { ...s.done };
        if (done[id] === day) delete done[id];
        else done[id] = day;
        return { ...s, done };
      });
      return tickRef.current;
    },
    [state, day],
  );

  const ctx: Ctx | null = state && {
    state,
    day,
    plan,
    parentUpdate,
    tick,
    finishSetup: async ({ name, grade, pin, sample }) => {
      const t = today();
      const salt = Crypto.randomUUID();
      const pinHash = await hashPin(pin, salt);
      const base = emptyState(t);
      const data = sample ? sampleData(t) : { assignments: [], events: [] };
      setState(freezeToday({ ...base, ...data, setupDone: true, child: { name, grade }, pinSalt: salt, pinHash }, t));
    },
    checkPin: async (pin) => (await hashPin(pin, state.pinSalt)) === state.pinHash,
    setPin: async (pin) => {
      const salt = Crypto.randomUUID();
      const pinHash = await hashPin(pin, salt);
      setState((s) => (s ? { ...s, pinSalt: salt, pinHash } : s));
    },
    addAssignment: (a) =>
      parentUpdate((s) => ({
        ...s,
        seq: s.seq + 1,
        assignments: [...s.assignments, { ...a, subject: matchSubject(a.subject, s), id: `p${s.seq + 1}`, createdOn: day, source: "parent" }],
        // a retake with a date replaces the "date not known yet" entry
        pendingRetakes:
          a.kind === "retake"
            ? (s.pendingRetakes ?? []).filter((r) => r.subject.toLowerCase() !== a.subject.toLowerCase())
            : s.pendingRetakes,
      })),
    savePendingRetake: (raw) =>
      parentUpdate((s) => {
        const subject = matchSubject(raw, s);
        if ((s.pendingRetakes ?? []).some((r) => r.subject.toLowerCase() === subject.toLowerCase())) return s;
        const n = s.seq + 1;
        return {
          ...s,
          seq: n + 1,
          pendingRetakes: [...(s.pendingRetakes ?? []), { id: `r${n}`, subject, since: day }],
          assignments: [
            ...s.assignments,
            {
              id: `p${n + 1}`,
              kind: "homework",
              subject,
              title: `Lepi õpetajaga kokku järeltöö aeg`,
              due: addDays(day, 2),
              minutes: 5,
              createdOn: day,
              source: "parent",
              askDate: true,
            },
          ],
        };
      }),
    removePendingRetake: (id) =>
      parentUpdate((s) => ({ ...s, pendingRetakes: (s.pendingRetakes ?? []).filter((r) => r.id !== id) })),
    attachNote: (id, text) =>
      parentUpdate((s) => ({
        ...s,
        assignments: s.assignments.map((a) => (a.id === id ? { ...a, note: a.note ? `${a.note}\n\n${text}` : text } : a)),
      })),
    addMany: (list) => {
      const ids = list.map((_, i) => `p${state.seq + i + 1}`);
      parentUpdate((s) => ({
        ...s,
        seq: s.seq + list.length,
        assignments: [...s.assignments, ...list.map((a, i) => ({ ...a, subject: matchSubject(a.subject, s), id: `p${s.seq + i + 1}`, createdOn: day, source: "parent" as const }))],
      }));
      return ids;
    },
    renameSubject: (from, to) => parentUpdate((s) => renameSubject(s, from, to)),
    removeMany: (ids) => parentUpdate((s) => ({ ...s, assignments: s.assignments.filter((a) => !ids.includes(a.id)) })),
    setReminder: (r) => setState((s) => (s ? { ...s, reminder: r } : s)),
    studentRetake: (subject, due) =>
      parentUpdate((s) => ({
        ...s,
        seq: s.seq + 1,
        assignments: [
          ...s.assignments,
          { id: `p${s.seq + 1}`, kind: "retake", subject, title: "järeltöö", due, minutes: 0, wrong: [], createdOn: day, source: "parent" },
        ],
        pendingRetakes: (s.pendingRetakes ?? []).filter((r) => r.subject.toLowerCase() !== subject.toLowerCase()),
      })),
    setReview: (id, review, note) =>
      parentUpdate((s) => ({
        ...s,
        assignments: s.assignments.map((a) => (a.id === id ? { ...a, review: review.length ? review : undefined, note: note || undefined } : a)),
      })),
    setPages: (id, from, to) =>
      parentUpdate((s) => ({
        ...s,
        assignments: s.assignments.map((a) => (a.id === id ? { ...a, kind: "book", pageFrom: from, pageTo: to } : a)),
      })),
    removeAssignment: (id) => parentUpdate((s) => ({ ...s, assignments: s.assignments.filter((a) => a.id !== id) })),
    addEvent: (e) =>
      parentUpdate((s) => ({ ...s, seq: s.seq + 1, events: [...s.events, { ...e, id: `e${s.seq + 1}` }] })),
    removeEvent: (id) => parentUpdate((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })),
    toggleExcuse: (id) =>
      parentUpdate((s) => {
        const excused = { ...s.excused };
        const done = { ...s.done };
        if (excused[id]) delete excused[id];
        else {
          excused[id] = true;
          delete done[id];
        }
        return { ...s, excused, done };
      }),
    saveReward: (r) =>
      parentUpdate((s) => {
        const o = s.reward;
        const changed = r.name !== o.name || r.unit !== o.unit || r.per !== o.per || (r.on && !o.on);
        return { ...s, reward: { ...r, since: changed ? day : o.since }, payouts: changed ? [] : s.payouts };
      }),
    pay: (amount, note) =>
      parentUpdate((s) => ({ ...s, payouts: [{ day, amount, note }, ...s.payouts] })),
    wipe: async () => {
      await AsyncStorage.removeItem(KEY).catch(() => {});
      setState(emptyState(today()));
    },
  };

  if (!ctx) return null;
  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}
