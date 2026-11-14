import React from "react";
import { View } from "react-native";
import { Card, Choice, H, Muted, Pill, Section, T } from "../components/ui";
import { addDays, longDate, type Day } from "../dates";
import { dayItems } from "../logic";
import { BUDGETS, eventsOn } from "../planner";
import { useStore } from "../store";
import { C } from "../theme";
import { tagFor } from "./Today";

export function WeekScreen() {
  const { state, day, plan, setBudget } = useStore();
  const days: Day[] = Array.from({ length: 7 }, (_, i) => addDays(day, i));
  return (
    <View>
      <H size={36}>Järgmised 7 päeva</H>
      <Muted style={{ fontSize: 16 }}>
        Tavaliselt piisab vaatest „Täna“. See vaade on ülevaateks, kui tahad ette vaadata.
      </Muted>

      <Section>Plaan</Section>
      <View style={{ gap: 10 }}>
        {days.map((d, i) => {
          const items =
            i === 0
              ? dayItems(state, d).map((x) => ({ ...x }))
              : (plan.byDay[d] ?? []).map((x) => ({ ...x, done: false, excused: false, leftover: false }));
          const ev = eventsOn(state, d, day);
          return (
            <Card key={d} style={[{ gap: 8 }, i === 0 && { borderWidth: 2, borderColor: C.lake }]}>
              <View style={{ gap: 0 }}>
                <H size={21}>{i === 0 ? "Täna · " : i === 1 ? "Homme · " : ""}{longDate(d)}</H>
                <Muted>{items.length ? `${items.length} sammu` : "Vaba päev"}</Muted>
              </View>
              {ev.map((e) => (
                <View key={e.key} style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill tag={e.tag === "due" ? "dueToday" : e.tag} label={e.tag === "due" ? "Ära anda" : undefined} />
                  <T style={{ fontSize: 15, flexShrink: 1 }}>{e.title}{e.tag === "req" ? `, ${e.when.replace(/^\S+\s/, "")}` : ""}</T>
                </View>
              ))}
              {items.map((x) => {
                const tag = tagFor(x, d);
                return (
                  <View key={x.id} style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line }}>
                    <T style={[{ fontSize: 16 }, x.done && { color: C.muted, textDecorationLine: "line-through" }]}>
                      {x.done ? "✓ " : ""}
                      {x.title}
                    </T>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <Muted>{x.minutes} min</Muted>
                      {tag ? <Pill tag={tag} /> : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          );
        })}
      </View>

      {state.studentBudget ? (
        <>
          <Section>Minu õppimise aeg päevas</Section>
          <Card style={{ gap: 8 }}>
            <Choice
              value={state.budget}
              onChange={setBudget}
              options={BUDGETS.map((m) => ({ value: m, label: `${m} min` }))}
            />
            <Muted>TASA jagab sammud nii, et päeva kokku tuleks umbes nii palju. Tänases vaates näed alati ainult järgmist sammu.</Muted>
          </Card>
        </>
      ) : null}

      <Section>Kuidas TASA plaani teeb</Section>
      <Card style={{ gap: 8 }}>
        {[
          "Suured tööd jagatakse umbes 25-minutilisteks sammudeks, lähim tähtaeg ees.",
          "Kontrolltöö kordamine algab kuni 7 päeva enne.",
          "Järeltöö puhul jagatakse õpetaja kordamisküsimused päevade peale.",
          "Raamatu puhul saad iga päev täpsed leheküljed.",
          "Pooleli jäänud sammud tulevad järgmisel päeval kõige ette.",
          "TASA kasutab ainult kooli antud ja vanema lisatud materjali. Ise ülesandeid ei koostata ega lahendata.",
        ].map((t) => (
          <T key={t} style={{ fontSize: 15, lineHeight: 22 }}>• {t}</T>
        ))}
        <Muted>Kodused tööd lisab lapsevanem: kleebib e-päevikust (eKool või Stuudium) või kirjutab käsitsi.</Muted>
      </Card>
    </View>
  );
}
