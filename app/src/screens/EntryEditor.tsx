import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useCelebrate } from "../components/Celebrate";
import { DayPicker } from "../components/DayPicker";
import { Btn, Choice, Field, Muted, T } from "../components/ui";
import { addDays, diffDays } from "../dates";
import { linkLabel, normalizeUrl } from "../links";
import { useStore } from "../store";
import { C } from "../theme";
import type { Assignment } from "../types";

// sized by content (flex: 0 collapses to zero height on the web inside a ScrollView)
const NOFLEX = { flexGrow: 0, flexShrink: 0, flexBasis: "auto" as const };

const MINUTES = [15, 25, 50, 75, 100, 150, 200, 250];

/** Links for a task: add one at a time, remove with ✕. */
export function LinksField({ links, setLinks }: { links: string[]; setLinks: (l: string[]) => void }) {
  const fx = useCelebrate();
  const [box, setBox] = useState("");
  const add = () => {
    const found = box.split(/\s+/).map(normalizeUrl).filter((u): u is string => !!u);
    if (!found.length) return fx.toast("See ei ole veebiaadress. Näiteks: https://www.opiq.ee/…");
    setLinks([...links, ...found.filter((u) => !links.includes(u))]);
    setBox("");
  };
  return (
    <View style={{ gap: 6 }}>
      <T style={{ color: C.muted, fontSize: 14 }}>Lingid (valikuline)</T>
      {links.map((u) => (
        <View key={u} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <T style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>🔗 {linkLabel(u)}</T>
          <Pressable accessibilityRole="button" accessibilityLabel={`Eemalda link ${linkLabel(u)}`} onPress={() => setLinks(links.filter((x) => x !== u))} hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <T bold style={{ color: C.muted }}>✕</T>
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <Field label="Kleebi link" value={box} onChangeText={setBox} placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={add} maxLength={2000} />
        <Btn small kind="ghost" title="Lisa link" onPress={add} />
      </View>
    </View>
  );
}

/** Fix a task after it was added: what, by when, how long, note and links. */
export function EntryEditor({ a, onDone }: { a: Assignment; onDone: () => void }) {
  const { day, updateAssignment } = useStore();
  const fx = useCelebrate();
  const [title, setTitle] = useState(a.title);
  const [due, setDue] = useState(a.due);
  const [minutes, setMinutes] = useState(a.minutes);
  const [note, setNote] = useState(a.note ?? "");
  const [links, setLinks] = useState(a.links ?? []);
  const timed = a.kind === "homework" || a.kind === "project" || a.kind === "test";
  const dueLabel = { homework: "Tähtaeg", project: "Tähtaeg", test: "Kontrolltöö päev", book: "Loetud peab olema", retake: "Järeltöö päev" }[a.kind];
  const from = addDays(day, 1);
  const opts = MINUTES.includes(minutes) ? MINUTES : [...MINUTES, minutes].sort((x, y) => x - y);
  const save = () => {
    if (a.kind !== "test" && a.kind !== "retake" && !title.trim()) return fx.toast("Kirjuta, mis on vaja teha.");
    updateAssignment(a.id, { title: title.trim() || a.title, due, minutes, note: note.trim(), links });
    fx.toast("Salvestatud.");
    onDone();
  };
  return (
    <View style={{ gap: 10, marginTop: 6, flexShrink: 0 }}>
      {a.kind !== "retake" ? <Field label={a.kind === "book" ? "Raamatu nimi" : "Mis on vaja teha?"} value={title} onChangeText={setTitle} maxLength={80} style={NOFLEX} /> : null}
      <DayPicker label={dueLabel} value={due} onChange={setDue} from={due < from ? due : from} refDay={day} days={Math.max(30, diffDays(from, due) + 1)} />
      {timed ? (
        <Choice label="Kui kaua see umbes võtab?" value={minutes} onChange={setMinutes} options={opts.map((m) => ({ value: m, label: `${m} min` }))} />
      ) : null}
      <Field label="Märkus (valikuline)" value={note} onChangeText={setNote} multiline maxLength={4000} style={NOFLEX} inputStyle={{ minHeight: 60, maxHeight: 200, textAlignVertical: "top" }} />
      <LinksField links={links} setLinks={setLinks} />
      {due <= day ? <Muted>Tähtaeg on möödas. Vali uus päev.</Muted> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn small title="Salvesta" onPress={save} />
        <Btn small kind="ghost" title="Tühista" onPress={onDone} />
      </View>
    </View>
  );
}
