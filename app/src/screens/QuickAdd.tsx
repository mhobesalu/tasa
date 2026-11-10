import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { useCelebrate } from "../components/Celebrate";
import { Btn, Muted, T } from "../components/ui";
import { longDate, relDate } from "../dates";
import { type Draft, type MessageAction, type ParsedMessage } from "../importText";
import { askNotifications, canReadImages, readClipboard, syncReminder, textFromScreenshots } from "../native";
import { planImport } from "../quickImport";
import { useStore } from "../store";
import { C, F } from "../theme";

type View_ =
  | { s: "start" }
  | { s: "busy" }
  | { s: "added"; items: Draft[]; ids: string[]; skipped: number; missed: number }
  | { s: "message"; msg: ParsedMessage }
  | { s: "none"; why: string }
  | { s: "remind" };

/**
 * "Lisa e-päevikust": copy the e-diary page or take screenshots, then one tap.
 * New items go straight into the plan; the whole batch can be undone.
 */
export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, day, addMany, removeMany, attachNote, addEvent, addAssignment, setReminder } = useStore();
  const fx = useCelebrate();
  const [v, setV] = useState<View_>({ s: "start" });

  const close = () => {
    setV({ s: "start" });
    onClose();
  };

  const run = async (get: () => Promise<string | null>) => {
    setV({ s: "busy" });
    let text: string | null = null;
    try {
      text = await get();
    } catch {
      setV({ s: "none", why: "Pilti ei õnnestunud lugeda. Proovi uuesti või kopeeri tekst." });
      return;
    }
    if (text === null) return setV({ s: "start" });
    if (!text.trim()) return setV({ s: "none", why: "Lõikelaud on tühi. Kopeeri e-päevikust kodutööde nimekiri ja proovi uuesti." });
    const r = planImport(text, day, state.assignments);
    if (r.add.length) {
      const ids = addMany(
        r.add.map((d) => ({ kind: d.kind, subject: d.subject, title: d.title, due: d.due, minutes: d.minutes, note: d.note || undefined })),
      );
      return setV({ s: "added", items: r.add, ids, skipped: r.skipped, missed: r.missed });
    }
    if (r.message) return setV({ s: "message", msg: r.message });
    if (r.skipped) return setV({ s: "none", why: `Uut ei leidnud: kõik ${r.skipped} on juba plaanis või tähtaeg on möödas.` });
    if (r.grades.length) return setV({ s: "none", why: "See on hinnete leht. Järeltöö saab lisada lapsevanema vaates." });
    setV({ s: "none", why: "Ei leidnud ülesandeid. Kopeeri või pildista e-päevikust kodutööde nimekiri koos kuupäevadega." });
  };

  const done = () => {
    // After the first successful import, offer the daily reminder once.
    if (!state.reminder?.asked) return setV({ s: "remind" });
    close();
  };

  const act = (msg: ParsedMessage, a: MessageAction) => {
    if (a.type === "attach") attachNote(a.aid, `Õpetaja sõnum: ${msg.text}`);
    else if (a.type === "event") addEvent({ title: a.title, day: a.day, time: a.time, weekly: false });
    else addAssignment({ kind: "homework", subject: a.subject, title: a.title, due: a.due, minutes: 10, note: msg.text });
    fx.toast(a.type === "attach" ? "Sõnum lisatud kontrolltöö juurde." : a.type === "event" ? "Lisatud kohustuslik aeg." : "Meeldetuletus lisatud.");
    done();
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={st.back} onPress={close} accessibilityLabel="Sulge" />
      <View style={st.sheet}>
        {v.s === "start" || v.s === "busy" ? (
          <>
            <T bold style={st.h}>Lisa e-päevikust</T>
            <Muted>
              Ava e-päevikus kodutööde nimekiri. Kopeeri see või tee ekraanipilt. TASA loeb selle telefonis ja lisab uued
              ülesanded plaani. Midagi ei saadeta kuhugi.
            </Muted>
            {v.s === "busy" ? (
              <ActivityIndicator color={C.lake} style={{ marginVertical: 24 }} />
            ) : (
              <View style={{ gap: 10, marginTop: 6 }}>
                <Btn title="Kleebi kopeeritud tekst" onPress={() => run(readClipboard)} />
                {canReadImages ? <Btn kind="ghost" title="Loe ekraanipildilt" onPress={() => run(textFromScreenshots)} /> : null}
                <Btn kind="ghost" title="Sulge" onPress={close} />
              </View>
            )}
          </>
        ) : v.s === "added" ? (
          <>
            <T bold style={st.h}>{v.items.length === 1 ? "Lisatud 1 ülesanne" : `Lisatud ${v.items.length} ülesannet`}</T>
            <View style={{ gap: 6 }}>
              {v.items.slice(0, 8).map((d) => (
                <T key={d.key} style={{ fontSize: 15 }}>
                  <T bold style={{ fontSize: 15 }}>{d.subject}</T> · {relDate(d.due, day)}
                  {d.kind === "test" ? " · kontrolltöö" : ""}
                </T>
              ))}
              {v.items.length > 8 ? <Muted>ja veel {v.items.length - 8}</Muted> : null}
              {v.skipped ? <Muted>{v.skipped} oli juba plaanis või tähtaeg on möödas.</Muted> : null}
              {v.missed ? <Muted>Leidsin ka {v.missed === 1 ? "1 tegemata töö" : `${v.missed} tegemata tööd`}. Need saab lisada lapsevanema vaates.</Muted> : null}
            </View>
            <View style={{ gap: 10, marginTop: 6 }}>
              <Btn title="Valmis" onPress={done} />
              <Btn
                kind="ghost"
                title="Võta tagasi"
                onPress={() => {
                  removeMany(v.ids);
                  fx.toast("Võetud tagasi.");
                  close();
                }}
              />
            </View>
          </>
        ) : v.s === "message" ? (
          <>
            <T bold style={st.h}>Sõnum: {v.msg.title}</T>
            <Muted>Mida TASA sellega tegema peaks?</Muted>
            <View style={{ gap: 10, marginTop: 6 }}>
              {v.msg.actions.map((a, i) => (
                <Btn
                  key={i}
                  kind={i === 0 ? "primary" : "ghost"}
                  title={
                    a.type === "attach"
                      ? `Lisa kordamise juurde (${a.label.replace(/ \d{4}-\d{2}-\d{2}$/, "")})`
                      : a.type === "event"
                        ? `Lisa kohustuslik aeg: ${longDate(a.day).toLowerCase()} kell ${a.time}`
                        : "Lisa meeldetuletus tänasesse plaani"
                  }
                  onPress={() => act(v.msg, a)}
                />
              ))}
              <Btn kind="ghost" title="Sulge" onPress={close} />
            </View>
          </>
        ) : v.s === "remind" ? (
          <>
            <T bold style={st.h}>Kas tuletame iga päev meelde?</T>
            <Muted>
              Kell 17 on uued kodutööd e-päevikus olemas (pärast seda õpetajad järgmiseks päevaks enam ei lisa). TASA saadab
              siis lühikese meeldetuletuse. Kella saab muuta lapsevanema vaates.
            </Muted>
            <View style={{ gap: 10, marginTop: 6 }}>
              <Btn
                title="Jah, kell 17"
                onPress={async () => {
                  const ok = await askNotifications();
                  setReminder({ on: ok, hour: 17, asked: true });
                  await syncReminder(ok, 17);
                  fx.toast(ok ? "Meeldetuletus iga päev kell 17." : "Teavitused on telefonis välja lülitatud.");
                  close();
                }}
              />
              <Btn
                kind="ghost"
                title="Ei, aitäh"
                onPress={() => {
                  setReminder({ on: false, hour: 17, asked: true });
                  close();
                }}
              />
            </View>
          </>
        ) : (
          <>
            <T bold style={st.h}>Midagi ei lisatud</T>
            <Muted>{v.why}</Muted>
            <View style={{ gap: 10, marginTop: 6 }}>
              <Btn title="Proovi uuesti" onPress={() => setV({ s: "start" })} />
              <Btn kind="ghost" title="Sulge" onPress={close} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  back: { flex: 1, backgroundColor: "rgba(20,30,50,0.35)" },
  sheet: {
    backgroundColor: C.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  h: { fontFamily: F.display, fontSize: 24, color: C.ink },
});
