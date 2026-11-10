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

interface Frame { top: number; left: number }
interface Line { text: string; frame?: Frame }
interface Block { text: string; frame?: Frame; lines?: Line[] }

/** Lines in reading order: top to bottom, then left to right. */
export function linesInOrder(blocks: Block[]): string[] {
  const lines: Line[] = [];
  for (const b of blocks) {
    if (b.lines?.length) lines.push(...b.lines.map((l) => ({ text: l.text, frame: l.frame ?? b.frame })));
    else lines.push({ text: b.text, frame: b.frame });
  }
  return lines
    .map((l, i) => ({ ...l, i }))
    .sort((a, b) => {
      const ta = a.frame?.top ?? a.i, tb = b.frame?.top ?? b.i;
      if (Math.abs(ta - tb) > 8) return ta - tb;
      return (a.frame?.left ?? 0) - (b.frame?.left ?? 0);
    })
    .map((l) => l.text.trim())
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
  return parts.join("\n");
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
