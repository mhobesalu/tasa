// Phone features (clipboard, screenshots, text recognition, reminders).
// Loaded lazily so tests and the web preview don't need the native modules.
import { Platform } from "react-native";

export const canReadImages = Platform.OS === "ios" || Platform.OS === "android";

export async function readClipboard(): Promise<string> {
  try {
    const Clipboard = require("expo-clipboard");
    return (await Clipboard.getStringAsync()) ?? "";
  } catch {
    return "";
  }
}

interface Frame { top: number; left: number; height?: number; width?: number }
interface Line { text: string; frame?: Frame; elements?: { text: string; frame?: Frame }[] }
interface Block { text: string; frame?: Frame; lines?: Line[] }

/** Put between screenshots so the reader knows where one picture ends. */
import { SHOT_BREAK as SHOT_BREAK_LINE } from "./importText";

/**
 * Lines in reading order. Pieces on the same row (a subject and its "1 h" or
 * "Kontrolltöö" badge, a month and its marks) are joined with a space.
 */
export function linesInOrder(blocks: Block[]): string[] {
  const lines: (Line & { i: number })[] = [];
  for (const b of blocks) {
    if (b.lines?.length) for (const l of b.lines) lines.push({ text: l.text, frame: l.frame ?? b.frame, i: lines.length });
    else lines.push({ text: b.text, frame: b.frame, i: lines.length });
  }
  const mid = (l: Line & { i: number }) => (l.frame ? l.frame.top + (l.frame.height ?? 0) / 2 : l.i * 1000);
  const sorted = [...lines].sort((a, b) => mid(a) - mid(b));
  const rows: (Line & { i: number })[][] = [];
  for (const l of sorted) {
    const row = rows[rows.length - 1];
    const h = Math.max(l.frame?.height ?? 0, row?.[0].frame?.height ?? 0);
    if (row && l.frame && row[0].frame && Math.abs(mid(l) - mid(row[0])) < Math.max(h * 0.5, 4)) row.push(l);
    else rows.push([l]);
  }
  return rows
    .map((r) => r.sort((a, b) => (a.frame?.left ?? 0) - (b.frame?.left ?? 0)).map((l) => l.text.trim()).filter(Boolean).join(" "))
    .filter(Boolean);
}

/**
 * Let the user pick one or more screenshots and read their text on the phone.
 * Nothing is uploaded. Returns null if the user cancelled.
 */
export async function textFromScreenshots(): Promise<string | null> {
  if (!canReadImages) return null;
  const ImagePicker = require("expo-image-picker");
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: 6,
    quality: 1,
  });
  if (res.canceled || !res.assets?.length) return null;
  const TextRecognition = require("@react-native-ml-kit/text-recognition").default;
  const parts: string[] = [];
  for (const a of res.assets) {
    const r = await TextRecognition.recognize(a.uri);
    parts.push(linesInOrder(r.blocks ?? [{ text: r.text }]).join("\n"));
  }
  return parts.join(`\n${SHOT_BREAK_LINE}\n`);
}

/**
 * Timetable screenshots: every piece of text with its place, so day columns can be told apart.
 * Returns null if the user cancelled.
 */
export async function piecesFromScreenshots(): Promise<import("./timetableShot").Piece[] | null> {
  if (!canReadImages) return null;
  const ImagePicker = require("expo-image-picker");
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 4, quality: 1 });
  if (res.canceled || !res.assets?.length) return null;
  const TextRecognition = require("@react-native-ml-kit/text-recognition").default;
  const { weekdayOf } = require("./timetableShot");
  const out: import("./timetableShot").Piece[] = [];
  const put = (text: string, f: Frame | undefined, shot: number) => {
    if (!text.trim() || !f) return;
    out.push({ text: text.trim(), x: f.left + (f.width ?? 0) / 2, y: f.top + (f.height ?? 0) / 2, shot });
  };
  for (let i = 0; i < res.assets.length; i++) {
    const r = await TextRecognition.recognize(res.assets[i].uri);
    for (const b of (r.blocks ?? []) as Block[]) {
      for (const l of b.lines ?? [{ text: b.text, frame: b.frame }]) {
        // a row of day headings read as one line ("E 16.11  T 17.11 …"): use the words
        const words = l.elements ?? [];
        const dayWords = words.filter((w) => weekdayOf(w.text) >= 0).length;
        if (dayWords >= 2) for (const w of words) put(w.text, w.frame, i);
        else put(l.text, l.frame ?? b.frame, i);
      }
    }
  }
  return out;
}

// ---- Daily reminder ----

const REMINDER_ID = "tasa-daily-homework";

export async function askNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const N = require("expo-notifications");
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return true;
    const r = await N.requestPermissionsAsync();
    return !!r.granted;
  } catch {
    return false;
  }
}

/** Schedule (or cancel) the reminder every day at `hour`:00. Safe to call often. */
export async function syncReminder(on: boolean, hour: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const N = require("expo-notifications");
    await N.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    if (!on || !(await N.getPermissionsAsync()).granted) return;
    await N.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: "TASA", body: "Lisa homsed kodutööd: kopeeri või pildista e-päevik.", data: { open: "quickAdd" } },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
    });
  } catch {}
}

/** Call `cb` when the user opens the app from the reminder. */
export function onReminderTap(cb: () => void): () => void {
  if (Platform.OS === "web") return () => {};
  try {
    const N = require("expo-notifications");
    N.getLastNotificationResponseAsync?.().then((r: any) => {
      if (r?.notification?.request?.content?.data?.open !== "quickAdd") return;
      N.clearLastNotificationResponseAsync?.().catch(() => {});
      cb();
    });
    const sub = N.addNotificationResponseReceivedListener((r: any) => {
      if (r?.notification?.request?.content?.data?.open === "quickAdd") cb();
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
