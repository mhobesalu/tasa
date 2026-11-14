import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useCelebrate } from "../components/Celebrate";
import { DayPicker } from "../components/DayPicker";
import { Btn, Card, H, Muted, Pill, Section, T, Tick } from "../components/ui";
import { addDays, diffDays, longDate, mondayOf, WEEKDAY_SHORT, type Day } from "../dates";
import { dayFull, dayItems, rewardSummary, weekStillPossible, type TodayItem } from "../logic";
import { HELP_LINKS, MOODS, offerLighter } from "../mood";
import { buildPlan, eventsOn, type DayEvent } from "../planner";
import { useStore } from "../store";
import { C, F } from "../theme";

const LINES = ["Boom! 🎉", "Tubli!", "Üks samm korras!", "Sõudsid jälle natuke edasi.", "Nii see käibki!", "Vaata, kui hästi läheb!", "Super, järgmine!"];

export function tagFor(x: { kind: string; due: Day; leftover?: boolean; excused?: boolean }, day: Day): string | null {
  if (x.excused) return "exc";
  if (x.leftover) return "old";
  if (x.kind === "retake") return "retake";
  if (x.kind === "test") return "test";
  const n = diffDays(day, x.due);
  if (n <= 0) return "dueToday";
  if (n === 1) return "due";
  if (x.kind === "book") return "book";
  if (x.kind === "project") return "project";
  return null;
}

function Meta({ x, day }: { x: TodayItem | (TodayItem & { leftover: false }); day: Day }) {
  const tag = tagFor(x, day);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <Muted>
        {x.subject}
        {x.minutes ? ` · ${x.minutes} min` : ""}
      </Muted>
      {tag ? <Pill tag={tag} /> : null}
    </View>
  );
}

export function EventRow({ e }: { e: DayEvent }) {
  return (
    <View style={st.req}>
      <Pill tag={e.tag === "due" ? "dueToday" : e.tag} label={e.tag === "due" ? "Ära anda" : undefined} />
      <T style={{ flex: 1, fontSize: 15 }}>
        <T bold style={{ fontSize: 15 }}>{e.title}</T>
        {e.when ? `, ${e.when}` : ""}
      </T>
    </View>
  );
}

export function TodayScreen({ onAdd }: { onAdd?: () => void }) {
  const { state, day, plan, tick } = useStore();
  const fx = useCelebrate();
  const [askFor, setAskFor] = useState<string | null>(null); // subject whose retake day we ask
  const [offset, setOffset] = useState(0); // -1 yesterday, 0 today, 1 tomorrow
  const [open, setOpen] = useState(true);
  const [showRest, setShowRest] = useState(false);
  const [timerFor, setTimerFor] = useState<TodayItem | null>(null);

  useEffect(() => { setOffset(0); setShowRest(false); }, [day]);

  const items = useMemo(() => dayItems(state, day), [state, day]);
  const active = items.filter((x) => !x.excused);
  const doneN = active.filter((x) => x.done).length;
  const full = dayFull(state, day);
  const next = active.find((x) => !x.done);
  const events = eventsOn(state, day, day);

  const doTick = (id: string) => {
    const was = items.find((x) => x.id === id);
    if (!was) return;
    const res = tick(id);
    if (res === "undone") {
      fx.toast("Linnuke võetud ära.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const a = state.assignments.find((x) => x.id === was.aid);
    if (a && state.studentRetakeDate !== false && (a.askDate || a.title === "Lepi õpetajaga kokku järeltöö aeg"))
      setAskFor(a.subject);
    const left = active.length - doneN - 1;
    if (left <= 0) {
      fx.all();
      fx.toast("Kõik tehtud! Tasa sõuad, kaugele jõuad. 🚣");
    } else {
      fx.one();
      fx.toast(stepLine(left));
    }
  };

  function stepLine(left: number) {
    const r = state.reward;
    const l = LINES[Math.floor(Math.random() * LINES.length)];
    if (!r.on) return `${l} Veel ${left}.`;
    if (r.per === "step") return `Kuldtäht ⭐ +${r.amount} ${r.unit}!`;
    return `${l} Veel ${left} ja ${r.amount} ${r.unit} on sinu!`;
  }

  if (offset !== 0) return <OtherDay offset={offset} setOffset={setOffset} />;

  return (
    <View>
      <DayHead title="Täna" sub={longDate(day)} onPrev={() => setOffset(-1)} onNext={() => setOffset(1)} />
      {doneN && next ? (
        <Muted style={{ marginTop: 6 }}>
          {doneN === 1 ? "1 samm juba tehtud ✓" : `${doneN} sammu juba tehtud ✓`}
        </Muted>
      ) : null}

      {state.reward.on ? <RewardCard open={open} setOpen={setOpen} /> : null}

      {events.length ? <View style={{ gap: 8, marginTop: 12 }}>{events.map((e) => <EventRow key={e.key} e={e} />)}</View> : null}

      {next ? (
        <View style={st.now} accessible={false}>
          <Text style={st.eyebrow}>Tee seda nüüd</Text>
          <H size={26} style={{ color: C.white }}>{next.title}</H>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Text style={{ color: "#E6F4F2", fontFamily: F.body, fontSize: 15 }}>
              {next.subject} · {next.minutes} min
            </Text>
            {tagFor(next, day) ? <Pill tag={tagFor(next, day)!} /> : null}
          </View>
          {next.note ? <Text style={st.note}>{next.note}</Text> : null}
          <Btn title="Tehtud" kind="sun" icon={<Tick color={C.onSun} />} onPress={() => doTick(next.id)} />
          <Pressable accessibilityRole="button" onPress={() => setTimerFor(next)} style={st.timerBtn}>
            <Text style={{ color: C.white, fontFamily: F.bodyBold, fontSize: 16 }}>Käivita {next.minutes} min taimer</Text>
          </Pressable>
        </View>
      ) : active.length ? (
        <Card style={{ marginTop: 16, alignItems: "center", backgroundColor: C.sunSoft }}>
          <H size={28}>Päev on tehtud! 🎉</H>
          <T style={{ textAlign: "center" }}>{doneMsg()}</T>
        </Card>
      ) : (
        <Card style={{ marginTop: 16, alignItems: "center" }}>
          <H size={26}>Täna pole midagi plaanis</H>
          <T style={{ textAlign: "center" }}>Puhka. Uued ülesanded ilmuvad siia, kui need tulevad.</T>
        </Card>
      )}

      {next && items.length > 1 ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showRest }}
            onPress={() => setShowRest(!showRest)}
            style={st.restBtn}
          >
            <Text style={st.restTxt}>{showRest ? "Peida ülejäänud" : "Mis veel tänaseks?"}</Text>
          </Pressable>
          {showRest ? <RestList items={items.filter((x) => x !== next)} day={day} onTick={doTick} /> : null}
        </>
      ) : !next && items.length ? (
        <>
          <Section>Tänased sammud</Section>
          <RestList items={items} day={day} onTick={doTick} />
        </>
      ) : null}

      <MoodCard />

      {onAdd ? (
        <Btn kind="ghost" title="＋ Lisa e-päevikust" onPress={onAdd} style={{ marginTop: 16 }} accessibilityHint="Kleebi või pildista kodutööde nimekiri" />
      ) : null}

      <RetakeDayModal subject={askFor} onClose={() => setAskFor(null)} />
      <TimerModal item={timerFor} onClose={() => setTimerFor(null)} onDone={(id) => { setTimerFor(null); doTick(id); }} />
    </View>
  );

  function doneMsg() {
    const r = state.reward;
    if (!r.on) return "Kõik sammud said tehtud. Puhka nüüd.";
    if (r.per === "day" && full) return `+${r.amount} ${r.unit} on sinu. Puhka nüüd.`;
    return `Täna kogusid ${rewardSummary(state, day).today} ${r.unit}. Puhka nüüd.`;
  }
}

function RestList({ items, day, onTick }: { items: TodayItem[]; day: Day; onTick: (id: string) => void }) {
  return (
    <Card style={{ paddingVertical: 4, gap: 0 }}>
      {items.map((x, i) => (
        <ItemRow key={x.id} x={x} day={day} first={i === 0} onTick={() => onTick(x.id)} />
      ))}
    </Card>
  );
}

export function ItemRow({ x, day, first, onTick, readOnly }: { x: TodayItem; day: Day; first?: boolean; onTick?: () => void; readOnly?: boolean }) {
  return (
    <View style={[st.item, !first && { borderTopWidth: 1, borderTopColor: C.line }, x.excused && { opacity: 0.55 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: x.done, disabled: readOnly || x.excused }}
        accessibilityLabel={(x.done ? "Võta linnuke ära: " : "Märgi tehtuks: ") + x.title}
        disabled={readOnly || x.excused}
        onPress={onTick}
        hitSlop={8}
        style={[st.chk, x.done && { backgroundColor: C.lake, borderColor: C.lake }]}
      >
        {x.done ? <Tick size={20} /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 4 }}>
        <T style={[{ fontSize: 17 }, x.done && { textDecorationLine: "line-through", color: C.muted }]}>{x.title}</T>
        <Meta x={x} day={day} />
      </View>
    </View>
  );
}

function DayHead({ title, sub, onPrev, onNext }: { title: string; sub: string; onPrev?: () => void; onNext?: () => void }) {
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <NavBtn label="Eelmine päev" sym="‹" onPress={onPrev} />
        <H size={36}>{title}</H>
        <NavBtn label="Järgmine päev" sym="›" onPress={onNext} />
      </View>
      <Muted style={{ textAlign: "center", fontSize: 16 }}>{sub}</Muted>
    </View>
  );
}

function NavBtn({ label, sym, onPress }: { label: string; sym: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={[st.nav, !onPress && { opacity: 0.25 }]}
    >
      <Text style={{ fontSize: 30, lineHeight: 34, color: C.lakeInk, fontFamily: F.bodyBold }}>{sym}</Text>
    </Pressable>
  );
}

function OtherDay({ offset, setOffset }: { offset: number; setOffset: (n: number) => void }) {
  const { state, day } = useStore();
  const d = addDays(day, offset);
  let items: TodayItem[];
  if (offset < 0) items = dayItems(state, d);
  else {
    // Plan tomorrow the way it will be planned when tomorrow comes: today's unfinished steps move on.
    const carry = new Set(dayItems(state, day).filter((x) => !x.done && !x.excused).map((x) => x.id));
    const future = buildPlan(state, d);
    items = (future.byDay[d] ?? [])
      .map((x) => ({ ...x, done: false, excused: false, leftover: carry.has(x.id) }))
      .sort((a, b) => Number(b.leftover) - Number(a.leftover));
  }
  const events = eventsOn(state, d, day);
  const mins = items.filter((x) => !x.excused).reduce((m, x) => m + x.minutes, 0);
  const leftovers = items.filter((x) => x.leftover).length;
  return (
    <View>
      <DayHead
        title={offset < 0 ? "Eile" : "Homme"}
        sub={longDate(d)}
        onPrev={offset > 0 ? () => setOffset(0) : undefined}
        onNext={offset < 0 ? () => setOffset(0) : undefined}
      />
      {offset > 0 ? (
        <Card style={{ marginTop: 14, backgroundColor: C.violetSoft }}>
          <T style={{ fontSize: 15 }}>
            See on homne plaan. Homme näed jälle ainult seda päeva.
            {leftovers
              ? " Tänasest pooleli jäänud sammud tulevad homme kõige ette." +
                (state.reward.on && state.reward.per === "day" ? " Tänast päevapreemiat need enam ei too, sest see tuleb ainult samal päeval lõpetatud päeva eest." : "")
              : ""}
          </T>
        </Card>
      ) : (
        <Muted style={{ marginTop: 10, textAlign: "center" }}>
          {items.length ? (dayFull(state, d) ? "Terve päev tehtud samal päeval ✓" : `${items.filter((x) => x.done).length} / ${items.length} tehtud`) : "Eile polnud midagi plaanis."}
        </Muted>
      )}
      {events.length ? <View style={{ gap: 8, marginTop: 12 }}>{events.map((e) => <EventRow key={e.key} e={e} />)}</View> : null}
      {items.length ? (
        <>
          <Section>
            {offset < 0 ? "Eilsed sammud" : "Homsed sammud"}
          </Section>
          <Card style={{ paddingVertical: 4, gap: 0 }}>
            {items.map((x, i) => (
              <ItemRow key={x.id} x={x} day={d} first={i === 0} readOnly />
            ))}
          </Card>
        </>
      ) : null}
      <View style={{ marginTop: 18, alignItems: "center" }}>
        <Btn small kind="ghost" title="Tagasi tänase juurde" onPress={() => setOffset(0)} style={{ alignSelf: "center" }} />
      </View>
    </View>
  );
}

function RewardCard({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) {
  const { state, day } = useStore();
  const r = state.reward;
  const sum = rewardSummary(state, day);
  const items = dayItems(state, day).filter((x) => !x.excused);
  const left = items.filter((x) => !x.done).length;
  const full = dayFull(state, day);
  let big: string;
  let line: string;
  if (r.goal > 0) {
    const need = Math.max(0, r.goal - sum.balance);
    big = `${Math.min(sum.balance, r.goal)} / ${r.goal} ${r.unit}`;
    line = need ? `Veel ${need} ${r.unit} ja ${r.name} on käes` : `${r.name} on käes! 🎉`;
  } else {
    big = `${sum.balance} ${r.unit}`;
    line =
      r.per === "step"
        ? `Iga linnuke = +${r.amount} ${r.unit}`
        : full
          ? `Tänane +${r.amount} ${r.unit} on käes!`
          : items.length
            ? `Veel ${left} ja täna +${r.amount} ${r.unit}`
            : `${r.name}`;
  }
  const m = mondayOf(day);
  const rules =
    (r.per === "step" ? "Iga tehtud samm" : "Kõik päeva ülesanded tehtud samal päeval") +
    ` → +${r.amount} ${r.unit}.` +
    (r.goal > 0 ? ` ${r.goal} ${r.unit} → ${r.name}.` : "") +
    (r.bonus > 0 ? ` Terve nädal (E–P) samal päeval tehtud → +${r.bonus} ${r.unit} boonus.` : "") +
    " Reeglid paneb paika lapsevanem.";
  return (
    <Card style={{ marginTop: 14, gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}
      >
        <Text style={{ fontFamily: F.display, fontSize: 28, color: C.lakeInk }}>{big}</Text>
        <T style={{ flex: 1, fontSize: 15, minWidth: 140 }}>{line}</T>
        <Text style={{ color: C.muted, fontSize: 18 }}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open ? (
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {WEEKDAY_SHORT.map((w, i) => {
              const d = addDays(m, i);
              const ok = dayFull(state, d);
              const cur = d === day;
              return (
                <View key={w} style={{ alignItems: "center", gap: 4 }}>
                  <View style={[st.dot, ok && { backgroundColor: C.lake, borderColor: C.lake }, cur && { borderColor: C.sun, borderWidth: 3 }]}>
                    {ok ? <Tick size={16} /> : null}
                  </View>
                  <Muted style={{ fontSize: 13 }}>{w}</Muted>
                </View>
              );
            })}
          </View>
          {r.bonus > 0 ? (
            <Muted>{weekStillPossible(state, day) ? `Terve nädal → +${r.bonus} ${r.unit}` : "Selle nädala boonus jäi seekord saamata. Uus nädal, uus võimalus."}</Muted>
          ) : null}
          <Muted>{rules}</Muted>
        </>
      ) : null}
    </Card>
  );
}

/** Optional end-of-day check-in. Only on this phone; the parent view never shows it. Used only to offer a lighter day. */
function MoodCard() {
  const { state, day, setMood, lighterTomorrow } = useStore();
  const fx = useCelebrate();
  const mood = state.moods?.[day];
  const heavy = (mood ?? 0) >= 3;
  const offer = offerLighter(state, day);
  const tomorrowLight = state.lighter?.includes(addDays(day, 1));
  return (
    <Card style={{ marginTop: 18, gap: 10 }}>
      <H size={20}>Kuidas tänane päev tundus?</H>
      <Muted>Ainult sinu jaoks. Lapsevanem seda ei näe.</Muted>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {MOODS.map((o) => {
          const on = mood === o.m;
          return (
            <Pressable
              key={o.m}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.label}
              onPress={() => setMood(on ? null : o.m)}
              style={[st.mood, on && { borderColor: C.lake, backgroundColor: C.lakeSoft }]}
            >
              <Text style={{ fontSize: 28 }}>{o.face}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.ink, textAlign: "center" }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {offer ? (
        <View style={{ gap: 8 }}>
          <T style={{ fontSize: 15 }}>Viimased päevad on olnud rasked. Kas teeme homse päeva kergemaks? Osa töid liigub hilisematele päevadele, kui tähtaeg lubab.</T>
          <Btn
            small
            title="Jah, kergem homme"
            onPress={() => {
              lighterTomorrow();
              fx.toast("Homme on kergem päev.");
            }}
          />
        </View>
      ) : tomorrowLight ? (
        <Muted>Homme on kergem päev.</Muted>
      ) : null}
      {heavy ? (
        <View style={{ gap: 6 }}>
          <T style={{ fontSize: 15 }}>Kui on raske, räägi kellegagi, keda usaldad. Siit leiad ka abi:</T>
          {HELP_LINKS.map((l) => (
            <Pressable key={l.url} accessibilityRole="link" onPress={() => Linking.openURL(l.url).catch(() => {})} style={{ paddingVertical: 6, minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: F.bodyBold, fontSize: 16, color: C.lakeInk, textDecorationLine: "underline" }}>{l.title}</Text>
              <Muted style={{ fontSize: 13 }}>{l.sub}</Muted>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Asked when the student ticks "Lepi õpetajaga kokku järeltöö aeg". No grades shown. */
function RetakeDayModal({ subject, onClose }: { subject: string | null; onClose: () => void }) {
  const { day, studentRetake } = useStore();
  const fx = useCelebrate();
  const [due, setDue] = useState<Day | null>(null);
  useEffect(() => setDue(null), [subject]);
  if (!subject) return null;
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose} accessibilityLabel="Sulge">
        <Pressable style={st.sheet} onPress={() => {}}>
          <Text style={[st.eyebrow, { color: C.lakeInk }]}>{subject}</Text>
          <H size={24}>Mis päeval järeltöö on?</H>
          <T>Vali päev, milles õpetajaga kokku leppisid. TASA jagab kordamise päevade peale enne seda.</T>
          <DayPicker label="Järeltöö päev" value={due ?? ""} onChange={setDue} from={addDays(day, 1)} refDay={day} days={21} />
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Btn
              title="Lisa plaani"
              disabled={!due}
              onPress={() => {
                if (!due) return;
                studentRetake(subject, due);
                fx.toast("Järeltöö on plaanis.");
                onClose();
              }}
            />
            <Btn title="Veel ei tea" kind="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimerModal({ item, onClose, onDone }: { item: TodayItem | null; onClose: () => void; onDone: (id: string) => void }) {
  const [end, setEnd] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!item) return;
    setEnd(Date.now() + item.minutes * 60_000);
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [item]);
  if (!item) return null;
  const left = Math.max(0, Math.round((end - now) / 1000));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose} accessibilityLabel="Sulge">
        <Pressable style={st.sheet} onPress={() => {}}>
          <Text style={[st.eyebrow, { color: C.lakeInk, textAlign: "center" }]}>Fookuse aeg</Text>
          <H size={24} style={{ textAlign: "center" }}>{item.title}</H>
          <Text style={st.big} accessibilityLabel={`${Math.ceil(left / 60)} minutit jäänud`}>
            {left ? `${mm}:${ss}` : "Aeg läbi!"}
          </Text>
          <T style={{ textAlign: "center" }}>Pane telefon eemale. Kui aeg saab läbi, tee 5 min pausi.</T>
          <View style={{ flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 8 }}>
            <Btn title="Tehtud" icon={<Tick />} onPress={() => onDone(item.id)} />
            <Btn title="Sulge" kind="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  bar: { height: 14, borderRadius: 99, backgroundColor: C.track, overflow: "hidden", marginTop: 16 },
  barFill: { height: "100%", backgroundColor: C.lake, borderRadius: 99 },
  now: { marginTop: 16, backgroundColor: C.lake, borderRadius: 22, padding: 20, gap: 12 },
  eyebrow: { fontFamily: F.bodyBold, color: C.sun, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
  note: { color: C.white, fontFamily: F.body, fontSize: 16, lineHeight: 23 },
  restBtn: { alignItems: "center", paddingVertical: 12, minHeight: 44, justifyContent: "center", marginTop: 8 },
  restTxt: { color: C.lake, fontFamily: F.bodyBold, fontSize: 16 },
  timerBtn: { alignItems: "center", paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  item: { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "flex-start" },
  chk: { width: 36, height: 36, borderRadius: 12, borderWidth: 2.5, borderColor: C.lake, alignItems: "center", justifyContent: "center", marginTop: 1 },
  nav: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  req: { flexDirection: "row", gap: 10, alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  mood: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: C.line, minHeight: 64 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, backgroundColor: "rgba(15,20,35,.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 10 },
  big: { fontFamily: F.display, fontSize: 72, lineHeight: 84, color: C.lakeInk, textAlign: "center" },
});
