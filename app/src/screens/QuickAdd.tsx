import React, { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useCelebrate } from "../components/Celebrate";
import { PagesAsk } from "../components/PagesAsk";
import { Btn, Field, Muted, T } from "../components/ui";
import { longDate, relDate } from "../dates";
import { type Draft, type MessageAction, type ParsedMessage } from "../importText";
import { askNotifications, canReadImages, readClipboard, syncReminder, textFromScreenshots } from "../native";
import { parseReview, rangeText, READING } from "../planner";
import { diffDays } from "../dates";
import { planImport } from "../quickImport";
import { useStore } from "../store";
import { C, F } from "../theme";

type View_ =
  | { s: "start" }
  | { s: "busy" }
  | { s: "added"; items: Draft[]; ids: string[]; skipped: number; missed: number }
  | { s: "message"; msg: ParsedMessage }
  | { s: "review"; text: string; head: string }
  | { s: "none"; why: string }
  | { s: "remind" };

/**
 * "Lisa e-päevikust": copy the e-diary page or take screenshots, then one tap.
 * New items go straight into the plan; the whole batch can be undone.
 */
export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, day, addMany, removeMany, attachNote, addEvent, addAssignment, setReminder, setReview } = useStore();
  const fx = useCelebrate();
  const [v, setV] = useState<View_>({ s: "start" });
  // a browser won't let the page read the clipboard: paste into a box instead
  const web = Platform.OS === "web";
  const [box, setBox] = useState("");

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
    if (!text.trim()) return setV({ s: "none", why: web ? "Kast on tühi. Kopeeri e-päevikust kodutööde nimekiri ja kleebi see kasti." : "Lõikelaud on tühi. Kopeeri e-päevikust kodutööde nimekiri ja proovi uuesti." });
    const r = planImport(text, day, state.assignments);
    if (r.add.length) {
      const ids = addMany(
        r.add.map((d) => ({ kind: d.kind, subject: d.subject, title: d.title, due: d.due, minutes: d.minutes, note: d.note || undefined })),
      );
      return setV({ s: "added", items: r.add, ids, skipped: r.skipped, missed: r.missed });
    }
    if (r.review.length)
      return setV({
        s: "review",
        text: r.review.every((x) => /^\d+$/.test(x)) ? rangeText(r.review) : r.review.join("\n"),
        head: text.trim().split(/\n/).slice(0, 2).join(" "),
      });
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
                {web ? (
                  <>
                    <TextInput
                      value={box}
                      onChangeText={(t) => {
                        setBox(t);
                        if (t.length - box.length > 40) {
                          setBox("");
                          run(async () => t);
                        }
                      }}
                      multiline
                      placeholder="Kleebi siia (Ctrl+V või pikk vajutus)…"
                      placeholderTextColor="#9AA0AE"
                      accessibilityLabel="Kleebi e-päeviku tekst"
                      style={st.box}
                      textAlignVertical="top"
                    />
                    <Btn title="Loe" onPress={() => { const t = box; setBox(""); run(async () => t); }} />
                  </>
                ) : (
                  <Btn title="Kleebi kopeeritud tekst" onPress={() => run(readClipboard)} />
                )}
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
              {state.assignments
                .filter((a) => v.ids.includes(a.id) && a.kind !== "book" && READING.test(a.title) && diffDays(day, a.due) >= 2)
                .slice(0, 3)
                .map((a) => (
                  <View key={a.id} style={{ gap: 4, marginTop: 6 }}>
                    <Muted>Lugemine: mis leheküljest mis leheküljeni? Siis jagab TASA leheküljed päevade peale.</Muted>
                    <PagesAsk a={a} />
                  </View>
                ))}
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
        ) : v.s === "review" ? (
          <ReviewPick
            text={v.text}
            setText={(text) => setV({ s: "review", text, head: v.head })}
            tests={state.assignments
              .filter((a) => a.kind === "test" && a.due > day)
              .sort((a, b) => a.due.localeCompare(b.due))
              // the sheet's heading usually names the subject ("Ajalugu: … (KT 12.11)"): offer that test first
              .sort((a, b) => Number(namesSubject(v.head, b.subject)) - Number(namesSubject(v.head, a.subject)))}
            day={day}
            onPick={(id) => {
              setReview(id, parseReview(v.text), state.assignments.find((a) => a.id === id)?.note);
              fx.toast("Kordamisülesanded lisatud.");
              done();
            }}
            onClose={close}
          />
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
  box: {
    minHeight: 110,
    maxHeight: 200,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    fontFamily: F.body,
    fontSize: 15,
    color: C.ink,
    backgroundColor: C.card,
  },
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

/** A photographed worksheet: check the numbers (cross out what the teacher left out), pick the test. */
function ReviewPick({ text, setText, tests, day, onPick, onClose }: {
  text: string; setText: (t: string) => void; tests: import("../types").Assignment[]; day: string;
  onPick: (id: string) => void; onClose: () => void;
}) {
  const items = parseReview(text);
  const numeric = items.length > 0 && items.every((x) => /^\d+$/.test(x));
  return (
    <>
      <T bold style={{ fontFamily: F.display, fontSize: 22 }}>Kordamisülesanded</T>
      <Muted>
        Leidsin {items.length} {numeric ? "ülesannet" : "küsimust"}. Kontrolli üle ja kustuta need, mida õpetaja ei andnud.
      </Muted>
      <Field
        label={numeric ? "Ülesannete numbrid" : "Küsimused"}
        value={text}
        onChangeText={setText}
        multiline
        style={{ flex: 0 }}
        inputStyle={{ minHeight: 48, maxHeight: 200, textAlignVertical: "top" }}
      />
      {tests.length ? (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Muted>Millise kontrolltöö kordamiseks?</Muted>
          {tests.slice(0, 4).map((a, i) => (
            <Btn key={a.id} kind={i === 0 ? "primary" : "ghost"} disabled={!items.length} title={`${a.subject}, ${relDate(a.due, day)}`} onPress={() => onPick(a.id)} />
          ))}
          <Btn kind="ghost" title="Sulge" onPress={onClose} />
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Muted>Plaanis pole veel kontrolltööd. Lisa kõigepealt kontrolltöö e-päevikust või lapsevanema vaates, siis saad need selle juurde lisada.</Muted>
          <Btn kind="ghost" title="Sulge" onPress={onClose} />
        </View>
      )}
    </>
  );
}

function namesSubject(head: string, subject: string): boolean {
  const h = head.toLowerCase();
  const sub = subject.toLowerCase().replace(/\s*\d+$/, "").trim();
  const first = h.split(/[:–-]/)[0].trim();
  return (!!sub && h.includes(sub)) || (first.length >= 4 && sub.includes(first));
}
