import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useCelebrate } from "../components/Celebrate";
import { Btn, Card, Muted, Pill, Row, T } from "../components/ui";
import { relDate } from "../dates";
import { isDuplicate, parseGrades, parsePasted, type Draft, type RetakeHint } from "../importText";
import { useStore } from "../store";
import { C, F } from "../theme";

/**
 * Paste the homework list (or the grades summary) copied from the e-diary.
 * Read on the phone only. The parent checks the list before anything is added.
 */
export function PasteImport({ onRetake }: { onRetake: (subject: string) => void }) {
  const { state, day, addAssignment } = useStore();
  const fx = useCelebrate();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [hints, setHints] = useState<RetakeHint[]>([]);
  const [on, setOn] = useState<Record<string, boolean>>({});

  const why = (d: Draft) =>
    d.due <= day ? "tähtaeg möödas" : isDuplicate(d, state.assignments) ? "juba plaanis" : null;

  const read = () => {
    const d = parsePasted(text, day);
    const h = parseGrades(text);
    if (!d.length && !h.length) {
      fx.toast("Ei leidnud midagi. Kopeeri kogu nimekiri koos kuupäevadega.");
      return;
    }
    setDrafts(d);
    setHints(h);
    setOn(Object.fromEntries(d.map((x) => [x.key, why(x) === null])));
  };

  const clear = () => {
    setText("");
    setDrafts(null);
    setHints([]);
  };

  const chosen = (drafts ?? []).filter((d) => on[d.key]);
  const add = () => {
    for (const d of chosen) {
      addAssignment({ kind: d.kind, subject: d.subject, title: d.title, due: d.due, minutes: d.minutes, note: d.note || undefined });
    }
    fx.toast(chosen.length === 1 ? "1 ülesanne lisatud plaani." : `${chosen.length} ülesannet lisatud plaani.`);
    clear();
  };

  return (
    <Card>
      <Muted>
        Kopeeri e-päevikust kodutööde nimekiri (Stuudiumis „Ülesanded, kodutööd ja kontrolltööd“) ja kleebi siia. Hinnete
        kokkuvõttest leiab TASA ained, kus võib olla vaja järeltööd. Kõik loetakse selles telefonis, midagi ei saadeta
        kuhugi ja hindeid ei salvestata.
      </Muted>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Kleebi siia…"
        placeholderTextColor="#9AA0AE"
        accessibilityLabel="Kleebi e-päeviku tekst"
        style={st.box}
        textAlignVertical="top"
      />
      <Row>
        <Btn title="Loe" onPress={read} />
        {text || drafts ? <Btn kind="ghost" title="Tühjenda" onPress={clear} /> : null}
      </Row>

      {drafts && drafts.length ? (
        <View style={{ gap: 6 }}>
          <T bold>Leitud ülesanded</T>
          <Muted>Vali, mida plaani lisada.</Muted>
          {drafts.map((d) => {
            const sel = !!on[d.key];
            const reason = why(d);
            return (
              <Pressable
                key={d.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sel }}
                onPress={() => setOn({ ...on, [d.key]: !sel })}
                style={[st.row, sel && { borderColor: C.lake, backgroundColor: C.lakeSoft }]}
              >
                <View style={[st.check, sel && { backgroundColor: C.lake, borderColor: C.lake }]}>
                  {sel ? <T style={{ color: C.white, fontSize: 14, lineHeight: 16 }}>✓</T> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T bold style={{ fontSize: 15 }}>
                    {d.subject} · {relDate(d.due, day)}
                  </T>
                  <T style={{ fontSize: 15 }}>{d.title}</T>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {d.kind === "test" ? <Pill tag="test" /> : null}
                    <Muted>{d.kind === "test" ? `kordamist ${d.minutes} min` : `umbes ${d.minutes} min`}</Muted>
                    {reason ? <Muted style={{ fontStyle: "italic" }}>{reason}</Muted> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
          <Btn
            title={chosen.length ? `Lisa ${chosen.length} plaani` : "Vali vähemalt üks"}
            onPress={() => (chosen.length ? add() : fx.toast("Vali vähemalt üks ülesanne."))}
          />
        </View>
      ) : null}

      {hints.length ? (
        <View style={{ gap: 6 }}>
          <T bold>Järeltöö võib olla vaja</T>
          <Muted>Lisa järeltöö, kui see on tulemas. Vali siis kuupäev ja ülesanded, mis läksid valesti.</Muted>
          {hints.map((h) => (
            <View key={h.subject} style={[st.row, { alignItems: "center" }]}>
              <T style={{ flex: 1, fontSize: 15 }}>
                {h.subject} <T style={{ color: C.muted, fontSize: 15 }}>({h.marks.join(", ")})</T>
              </T>
              <Btn small kind="ghost" title="Lisa järeltöö" onPress={() => onRetake(h.subject)} />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const st = StyleSheet.create({
  box: {
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: 12,
    fontFamily: F.body,
    fontSize: 15,
    color: C.ink,
    backgroundColor: C.white,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    backgroundColor: C.white,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
