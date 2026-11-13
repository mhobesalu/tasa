import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useCelebrate } from "../components/Celebrate";
import { DayPicker } from "../components/DayPicker";
import { PagesAsk } from "../components/PagesAsk";
import { Btn, Card, Choice, Field, H, Muted, Row, Section, T } from "../components/ui";
import { addDays, diffDays, relDate, shortDate, WEEKDAY_NAMES, WEEKDAY_SHORT, type Day } from "../dates";
import { dayItems, rewardSummary, weekStats } from "../logic";
import { numList, parseReview, rangeText, READING, stepsOf } from "../planner";
import { useStore } from "../store";
import { C, F } from "../theme";
import { askNotifications, canReadImages, readClipboard, textFromScreenshots } from "../native";
import { knownSubjects, lessonDays, setDays } from "../timetable";
import { PasteImport } from "./PasteImport";
import type { Kind, RewardConfig } from "../types";

export function ParentScreen({ unlocked, setUnlocked }: { unlocked: boolean; setUnlocked: (b: boolean) => void }) {
  if (!unlocked) return <PinGate onOk={() => setUnlocked(true)} />;
  return <ParentHome onLock={() => setUnlocked(false)} />;
}

function PinGate({ onOk }: { onOk: () => void }) {
  const { checkPin } = useStore();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(false);
  const tryPin = async (v: string) => {
    if (!/^\d{4}$/.test(v)) return;
    if (await checkPin(v)) onOk();
    else {
      setErr("Vale PIN-kood. Proovi uuesti.");
      setPin("");
    }
  };
  return (
    <View>
      <H size={36}>Lapsevanem</H>
      <Muted style={{ fontSize: 16 }}>See vaade on ainult lapsevanemale. Laps seda ei näe.</Muted>
      <Card style={{ marginTop: 18 }}>
        <T style={{ color: C.muted, fontSize: 14 }}>Vanema PIN-kood</T>
        <TextInput
          value={pin}
          onChangeText={(v) => {
            const d = v.replace(/\D/g, "").slice(0, 4);
            setPin(d);
            setErr("");
            if (d.length === 4) tryPin(d);
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          autoFocus
          accessibilityLabel="Vanema PIN-kood"
          placeholder="••••"
          placeholderTextColor="#9AA0AE"
          style={st.pin}
        />
        {err ? <T style={{ color: C.boatInk }}>{err}</T> : null}
        <Pressable accessibilityRole="button" onPress={() => setForgot(!forgot)}>
          <T style={{ color: C.lakeInk, textDecorationLine: "underline", fontSize: 15 }}>Unustasid PIN-koodi?</T>
        </Pressable>
        {forgot ? (
          <Muted>
            PIN-koodi ei saa taastada, sest see on ainult selles telefonis. Lapsevanem saab TASA telefonist eemaldada ja uuesti paigaldada. Siis algab kõik otsast.
          </Muted>
        ) : null}
      </Card>
    </View>
  );
}

const KINDS: { value: Kind | "event"; label: string }[] = [
  { value: "homework", label: "Kodune töö" },
  { value: "project", label: "Suur töö" },
  { value: "test", label: "Kontrolltöö" },
  { value: "book", label: "Raamat" },
  { value: "retake", label: "Järeltöö" },
  { value: "event", label: "Kohustuslik aeg" },
];


function AddForm({ prefill }: { prefill?: { kind: Kind; subject: string; title?: string } }) {
  const { day, addAssignment, addEvent } = useStore();
  const fx = useCelebrate();
  const [kind, setKind] = useState<Kind | "event">(prefill?.kind ?? "homework");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [due, setDue] = useState<Day>(addDays(day, 2));
  const [minutes, setMinutes] = useState(50);
  const [pFrom, setPFrom] = useState("1");
  const [pTo, setPTo] = useState("");
  const [review, setReview] = useState("");
  const [reviewFrom, setReviewFrom] = useState("");
  const [time, setTime] = useState("15:00–15:45");
  const [weekly, setWeekly] = useState(true);

  const reset = () => {
    setTitle("");
    setPTo("");
    setReview("");
    setReviewFrom("");
  };

  const submit = () => {
    const subj = subject.trim();
    if (kind === "event") {
      if (!title.trim()) return fx.toast("Kirjuta, mis see on.");
      addEvent({ title: title.trim(), day: due, time: time.trim(), weekly });
      fx.toast("Lisatud.");
      return reset();
    }
    if (!subj) return fx.toast("Kirjuta aine nimi.");
    if (kind === "book") {
      const a = parseInt(pFrom, 10), b = parseInt(pTo, 10);
      if (!(a > 0 && b >= a)) return fx.toast("Kirjuta leheküljed, näiteks 41 kuni 180.");
      addAssignment({ kind, subject: subj, title: title.trim() || "raamat", due, minutes: 0, pageFrom: a, pageTo: b });
    } else if (kind === "retake") {
      const r = parseReview(review);
      addAssignment({
        kind, subject: subj, title: "järeltöö", due, minutes: 0,
        ...(r.length ? { review: r } : {}),
        ...(reviewFrom.trim() ? { note: reviewFrom.trim() } : {}),
      });
    } else {
      if (kind !== "test" && !title.trim()) return fx.toast("Kirjuta, mis on vaja teha.");
      const r = kind === "test" ? parseReview(review) : [];
      addAssignment({
        kind, subject: subj, title: title.trim() || "kontrolltöö", due, minutes,
        ...(r.length ? { review: r } : {}),
        ...(kind === "test" && reviewFrom.trim() ? { note: reviewFrom.trim() } : {}),
      });
    }
    fx.toast("Lisatud plaani.");
    reset();
  };

  const dueLabel = { homework: "Tähtaeg", project: "Tähtaeg", test: "Kontrolltöö päev", book: "Loetud peab olema", retake: "Järeltöö päev", event: "Päev" }[kind];

  return (
    <Card>
      <Muted>
        Lisa ülesanne, mida e-päevikus pole (näiteks õpetaja ütles selle ainult tunnis). TASA jagab selle sammudeks enne tähtaega.
      </Muted>
      <Choice value={kind} options={KINDS} onChange={(k) => setKind(k)} />
      {kind !== "event" ? (
        <Field label="Aine" value={subject} onChangeText={setSubject} placeholder="nt Filmiõpetus" maxLength={30} />
      ) : null}
      {kind === "homework" || kind === "project" || kind === "event" || kind === "book" ? (
        <Field
          label={kind === "book" ? "Raamatu nimi" : kind === "event" ? "Mis see on?" : "Mis on vaja teha?"}
          value={title}
          onChangeText={setTitle}
          placeholder={kind === "book" ? "nt „Kevade“" : kind === "event" ? "nt Matemaatika konsultatsioon" : "nt Lühifilmi stsenaarium, 1 lk"}
          maxLength={60}
        />
      ) : null}
      {kind === "retake" ? (
        <View style={{ gap: 8 }}>
          <Muted>
            Kui õpetaja andis järeltööks kordamisküsimused või -ülesanded, lisa need: TASA jagab need päevade peale. Kui ei andnud,
            kordab õpilane teemat oma vihiku ja kooli materjali järgi. Õpilane näeb ainult samme, mitte hinnet.
          </Muted>
          <ReviewFields review={review} setReview={setReview} from={reviewFrom} setFrom={setReviewFrom} />
        </View>
      ) : null}

      <DayPicker label={dueLabel} value={due} onChange={setDue} from={kind === "event" ? day : addDays(day, 1)} refDay={day} days={kind === "test" || kind === "book" ? 30 : 21} />

      {kind === "homework" || kind === "project" || kind === "test" ? (
        <Choice
          label={kind === "test" ? "Kui palju kordamist kokku?" : "Kui kaua see umbes võtab?"}
          value={minutes}
          onChange={setMinutes}
          options={(kind === "homework" ? [15, 25, 50, 75, 100] : [50, 75, 100, 150, 200, 250]).map((m) => ({
            value: m,
            label: `${m} min`,
          }))}
        />
      ) : null}

      {kind === "test" ? <ReviewFields review={review} setReview={setReview} from={reviewFrom} setFrom={setReviewFrom} /> : null}

      {kind === "book" ? (
        <Row>
          <Field label="Alates leheküljest" value={pFrom} onChangeText={(v) => setPFrom(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={4} />
          <Field label="Kuni leheküljeni" value={pTo} onChangeText={(v) => setPTo(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={4} placeholder="nt 180" />
        </Row>
      ) : null}

      {kind === "event" ? (
        <>
          <Field label="Kellaaeg" value={time} onChangeText={setTime} placeholder="nt 15:00–15:45" maxLength={20} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Switch value={weekly} onValueChange={setWeekly} trackColor={{ true: C.lake, false: C.line }} accessibilityLabel="Iga nädal" />
            <T>Iga nädal samal päeval</T>
          </View>
        </>
      ) : null}

      <Btn title="Lisa plaani" onPress={submit} />
    </Card>
  );
}

function PlannedList() {
  const { state, day, removeAssignment, removeEvent } = useStore();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const list = [...state.assignments]
    .filter((a) => diffDays(day, a.due) >= -1)
    .sort((a, b) => a.due.localeCompare(b.due));
  const kindLabel: Record<Kind, string> = { homework: "Kodune töö", project: "Suur töö", test: "Kontrolltöö", book: "Raamat", retake: "Järeltöö" };
  return (
    <Card style={{ gap: 0, paddingVertical: 6 }}>
      {!list.length && !state.events.length ? <Muted style={{ paddingVertical: 10 }}>Plaanis pole veel midagi.</Muted> : null}
      {list.map((a, i) => {
        const steps = stepsOf(a).filter((x) => !state.excused[x.id]);
        const done = steps.filter((x) => state.done[x.id]).length;
        return (
          <View key={a.id} style={[st.prow, i > 0 && st.rowLine]}>
            <View style={{ flex: 1, gap: 2 }}>
              <T>
                {a.subject}: {a.kind === "book" ? `${a.title}, lk ${a.pageFrom}–${a.pageTo}` : a.kind === "retake" ? (a.wrong?.length && !a.review?.length ? `järeltöö, ${numList(a.wrong)}` : "järeltöö") : a.title}
              </T>
              <Muted>
                {kindLabel[a.kind]} · {relDate(a.due, day)} · {done} / {steps.length} sammu tehtud
                {a.source === "sample" ? " · näidis" : ""}
              </Muted>
              {a.kind === "homework" && READING.test(a.title) && diffDays(day, a.due) >= 2 ? (
                editing === a.id ? (
                  <PagesAsk a={a} compact onDone={() => setEditing(null)} />
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => setEditing(a.id)} style={{ minHeight: 36, justifyContent: "center" }}>
                    <T style={{ color: C.lakeInk, fontSize: 15 }} bold>＋ Lisa leheküljed</T>
                  </Pressable>
                )
              ) : null}
              {a.kind === "test" || a.kind === "retake" ? (
                editing === a.id ? (
                  <ReviewEditor a={a} onDone={() => setEditing(null)} />
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => setEditing(a.id)} style={{ minHeight: 36, justifyContent: "center" }}>
                    <T style={{ color: C.lakeInk, fontSize: 15 }} bold>
                      {a.review?.length ? `${a.review.every((x) => /^\d+$/.test(x)) ? "Kordamisülesandeid" : "Kordamisküsimusi"} ${a.review.length} · muuda` : "＋ Lisa kordamisküsimused"}
                    </T>
                  </Pressable>
                )
              ) : null}
            </View>
            {confirm === a.id ? (
              <Btn small kind="danger" title="Jah, eemalda" onPress={() => { removeAssignment(a.id); setConfirm(null); }} />
            ) : (
              <Btn small kind="ghost" title="Eemalda" onPress={() => setConfirm(a.id)} />
            )}
          </View>
        );
      })}
      {state.events.map((e, i) => (
        <View key={e.id} style={[st.prow, (i > 0 || list.length > 0) && st.rowLine]}>
          <View style={{ flex: 1, gap: 2 }}>
            <T>{e.title}</T>
            <Muted>
              Kohustuslik · {e.weekly ? `iga ${["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev", "pühapäev"][(new Date(e.day + "T12:00").getDay() + 6) % 7]}` : shortDate(e.day)} {e.time}
            </Muted>
          </View>
          <Btn small kind="ghost" title="Eemalda" onPress={() => removeEvent(e.id)} />
        </View>
      ))}
    </Card>
  );
}

function ReviewFields({ review, setReview, from, setFrom }: { review: string; setReview: (v: string) => void; from: string; setFrom: (v: string) => void }) {
  const fx = useCelebrate();
  const [busy, setBusy] = useState(false);
  const items = parseReview(review);
  const numeric = items.length > 0 && items.every((x) => /^\d+$/.test(x));
  // read questions from a screenshot / photo or the clipboard, then show them one per line to check
  const take = (raw: string | null) => {
    if (raw === null) return;
    if (!raw.trim()) return fx.toast("Vajuta kasti „Või kirjuta“ ja kleebi seal (Ctrl+V või pikk vajutus).");
    const got = parseReview(raw);
    if (!got.length) return fx.toast("Küsimusi ei leidnud. Proovi teist pilti või kirjuta need.");
    setReview(got.every((x) => /^\d+$/.test(x)) ? rangeText(got) : got.join("\n"));
    fx.toast(`Leidsin ${got.length}. Vaata üle.`);
  };
  return (
    <View style={{ gap: 8 }}>
      <T style={{ color: C.muted, fontSize: 14 }}>Kordamisküsimused või -ülesanded (kui õpetaja andis)</T>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {canReadImages ? (
          <Btn
            small
            kind="ghost"
            title={busy ? "Loen…" : "Ekraanipildilt"}
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              try { take(await textFromScreenshots()); } catch { fx.toast("Pilti ei saanud lugeda."); }
              setBusy(false);
            }}
          />
        ) : null}
        <Btn small kind="ghost" title="Kleebi" onPress={async () => take(await readClipboard())} />
      </View>
      <Field
        label="Või kirjuta"
        value={review}
        onChangeText={setReview}
        placeholder={"nt 1–12, 15\nvõi iga küsimus eraldi real"}
        multiline
        style={{ flex: 0 }}
        inputStyle={{ minHeight: 70, maxHeight: 260, textAlignVertical: "top" }}
        maxLength={6000}
      />
      <Field style={{ flex: 0 }} label="Kust need on? (valikuline)" value={from} onChangeText={setFrom} placeholder="nt Kordamisleht, töövihik lk 45" maxLength={200} />
      {items.length ? (
        <Muted>{numeric ? `${items.length} ülesannet` : `${items.length} küsimust`}. TASA jagab need kordamise sammudele järjest. Pilt jääb telefoni.</Muted>
      ) : null}
    </View>
  );
}

function ReviewEditor({ a, onDone }: { a: import("../types").Assignment; onDone: () => void }) {
  const { setReview } = useStore();
  const fx = useCelebrate();
  const numeric = (a.review ?? []).every((x) => /^\d+$/.test(x));
  const [text, setText] = useState(numeric ? rangeText(a.review ?? []) : (a.review ?? []).join("\n"));
  const [from, setFrom] = useState(a.note ?? "");
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <ReviewFields review={text} setReview={setText} from={from} setFrom={setFrom} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn small title="Salvesta" onPress={() => { setReview(a.id, parseReview(text), from.trim()); fx.toast("Salvestatud."); onDone(); }} />
        <Btn small kind="ghost" title="Tühista" onPress={onDone} />
      </View>
    </View>
  );
}

function TodayExcuse() {
  const { state, day, toggleExcuse } = useStore();
  const items = dayItems(state, day);
  return (
    <Card style={{ gap: 0, paddingVertical: 6 }}>
      <Muted style={{ paddingVertical: 8 }}>Kui laps on haige, saad sammu vabandada. See ei loe siis päeva tulemuse sisse.</Muted>
      {!items.length ? <Muted style={{ paddingBottom: 8 }}>Täna pole samme.</Muted> : null}
      {items.map((x) => (
        <View key={x.id} style={[st.prow, st.rowLine]}>
          <View style={{ flex: 1, gap: 2 }}>
            <T>{x.title}</T>
            <Muted>{x.excused ? "Vabandatud" : x.done ? "Tehtud ✓" : "Tegemata"}</Muted>
          </View>
          <Btn small kind="ghost" title={x.excused ? "Taasta" : "Vabanda"} onPress={() => toggleExcuse(x.id)} />
        </View>
      ))}
    </Card>
  );
}

const PRESETS: Omit<RewardConfig, "since">[] = [
  { on: true, name: "Ekraaniaeg", unit: "minutit", per: "step", amount: 10, goal: 0, bonus: 30 },
  { on: true, name: "Filmiõhtu vanemaga", unit: "tähte", per: "step", amount: 1, goal: 30, bonus: 0 },
  { on: true, name: "Pereretk aasta lõpus", unit: "tähte", per: "day", amount: 1, goal: 120, bonus: 2 },
];

function RewardSettings() {
  const { state, day, saveReward, pay } = useStore();
  const fx = useCelebrate();
  const r = state.reward;
  const [f, setF] = useState({ ...r, amount: String(r.amount), goal: String(r.goal), bonus: String(r.bonus) });
  const sum = rewardSummary(state, day);
  const num = (v: string) => Math.max(0, Math.min(10000, parseInt(v || "0", 10) || 0));
  const save = (o?: Omit<RewardConfig, "since">) => {
    const next = o ?? { on: f.on, name: f.name.trim() || "Preemia", unit: f.unit.trim() || "punkti", per: f.per, amount: num(f.amount), goal: num(f.goal), bonus: num(f.bonus) };
    saveReward(next);
    if (o) setF({ ...o, since: r.since, amount: String(o.amount), goal: String(o.goal), bonus: String(o.bonus) });
    fx.toast("Salvestatud.");
  };
  const reached = r.goal > 0 && sum.balance >= r.goal;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch
          value={f.on}
          onValueChange={(on) => {
            setF({ ...f, on });
            saveReward({ ...r, on });
          }}
          trackColor={{ true: C.lake, false: C.line }}
          accessibilityLabel="Preemia on sees"
        />
        <T bold>Preemia on sees</T>
      </View>
      {!f.on ? <Muted>Laps näeb ainult edenemist ja tähistusi.</Muted> : (
        <>
          <Row>
            <Field label="Mis on preemia?" value={f.name} onChangeText={(name) => setF({ ...f, name })} placeholder="nt Ekraaniaeg" maxLength={30} />
            <Field label="Ühik" value={f.unit} onChangeText={(unit) => setF({ ...f, unit })} placeholder="nt minutit" maxLength={12} style={{ maxWidth: 130 }} />
          </Row>
          <Choice
            label="Mille eest?"
            value={f.per}
            onChange={(per) => setF({ ...f, per })}
            options={[
              { value: "step", label: "iga tehtud samm" },
              { value: "day", label: "terve päev tehtud samal päeval" },
            ]}
          />
          <Row>
            <Field label={`Kui palju (${f.unit || "ühikut"})`} value={f.amount} onChangeText={(amount) => setF({ ...f, amount })} keyboardType="number-pad" maxLength={5} />
            <Field label="Eesmärk (0 = pole)" value={f.goal} onChangeText={(goal) => setF({ ...f, goal })} keyboardType="number-pad" maxLength={5} />
            <Field label="Nädala boonus" value={f.bonus} onChangeText={(bonus) => setF({ ...f, bonus })} keyboardType="number-pad" maxLength={5} />
          </Row>
          <Muted>Nädala boonus tuleb, kui iga päev esmaspäevast pühapäevani said tehtud samal päeval.</Muted>
          <Btn small title="Salvesta preemia" onPress={() => save()} />
          <Muted>
            Proovi:{" "}
            {PRESETS.map((p) => (
              <Text key={p.name} onPress={() => save(p)} style={{ color: C.lakeInk, textDecorationLine: "underline" }} accessibilityRole="button">
                {p.name} · {p.unit}{"   "}
              </Text>
            ))}
          </Muted>
          <View style={[st.prow, st.rowLine]}>
            <T style={{ flex: 1 }}>
              {r.goal > 0 ? `Kogutud: ${sum.balance} / ${r.goal} ${r.unit}` : `Välja andmata: ${sum.balance} ${r.unit}`}
            </T>
            {r.goal > 0 && !reached ? (
              <Muted>Veel kogumisel</Muted>
            ) : (
              <Btn
                small
                title={r.goal > 0 ? "Preemia antud" : "Märgi antuks"}
                disabled={sum.balance <= 0}
                onPress={() => {
                  const amt = r.goal > 0 ? r.goal : sum.balance;
                  pay(amt, r.goal > 0 ? `${r.name} antud` : `Välja antud ${amt} ${r.unit}`);
                  fx.toast("Salvestatud.");
                }}
              />
            )}
          </View>
          {state.payouts.length ? (
            <Muted>{state.payouts.slice(0, 5).map((p) => `${shortDate(p.day)}: ${p.note}`).join("\n")}</Muted>
          ) : null}
        </>
      )}
    </Card>
  );
}

function Settings() {
  const { state, parentUpdate, setPin, setReminder } = useStore();
  const fx = useCelebrate();
  const [name, setName] = useState(state.child.name);
  const [grade, setGrade] = useState(state.child.grade);
  const [pin1, setPin1] = useState("");
  return (
    <Card>
      <Row>
        <Field label="Lapse nimi" value={name} onChangeText={setName} maxLength={20} />
        <Field label="Klass" value={grade} onChangeText={setGrade} maxLength={10} style={{ maxWidth: 110 }} />
      </Row>
      <Choice
        label="Meeldetuletus: lisa homsed kodutööd"
        value={state.reminder?.on ? state.reminder.hour : 0}
        onChange={async (hour) => {
          const ok = hour === 0 ? false : await askNotifications();
          setReminder({ on: ok, hour: hour || state.reminder?.hour || 17, asked: true });
          if (hour && !ok) fx.toast("Teavitused on telefonis välja lülitatud. Luba need telefoni seadetes.");
        }}
        options={[
          { value: 0, label: "Väljas" },
          ...[16, 17, 18, 19].map((h) => ({ value: h, label: `kell ${h}` })),
        ]}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch
          value={state.studentRetakeDate !== false}
          onValueChange={(on) => parentUpdate((s) => ({ ...s, studentRetakeDate: on }))}
          trackColor={{ true: C.lake, false: C.line }}
          accessibilityLabel="Õpilane lisab ise järeltöö aja"
        />
        <View style={{ flex: 1 }}>
          <T>Õpilane lisab ise järeltöö aja</T>
          <Muted>Kui õpilane on õpetajaga kokku leppinud, valib ta päeva ise. Hinnet ta ei näe.</Muted>
        </View>
      </View>
      <Choice
        label="Õppimise aeg päevas (umbes)"
        value={state.budget}
        onChange={(budget) => parentUpdate((s) => ({ ...s, budget }))}
        options={[50, 75, 100, 125, 150].map((m) => ({ value: m, label: `${m} min` }))}
      />
      <Btn
        small
        kind="ghost"
        title="Salvesta nimi ja klass"
        onPress={() => {
          parentUpdate((s) => ({ ...s, child: { name: name.trim() || s.child.name, grade: grade.trim() } }));
          fx.toast("Salvestatud.");
        }}
      />
      <Row style={{ alignItems: "flex-end" }}>
        <Field label="Uus PIN-kood (4 numbrit)" value={pin1} onChangeText={(v) => setPin1(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />
        <Btn
          small
          kind="ghost"
          title="Muuda PIN"
          disabled={pin1.length !== 4}
          onPress={async () => {
            await setPin(pin1);
            setPin1("");
            fx.toast("PIN-kood muudetud.");
          }}
        />
      </Row>
    </Card>
  );
}

function Privacy() {
  const { wipe } = useStore();
  const [sure, setSure] = useState(false);
  return (
    <Card style={{ gap: 6 }}>
      {[
        "Lapsevanem on konto omanik ja annab nõusoleku.",
        "Praegu on kõik andmed ainult selles telefonis. Neid ei saadeta kuhugi.",
        "E-päeviku parooli ei küsita kunagi. Ülesanded kleebid sina e-päevikust.",
        "Õpetajad ei näe midagi. Diagnoose ei salvestata.",
      ].map((t) => (
        <T key={t} style={{ fontSize: 15, lineHeight: 22 }}>• {t}</T>
      ))}
      {sure ? (
        <View style={{ gap: 8, marginTop: 6 }}>
          <T bold>Kas kustutada kõik TASA andmed sellest telefonist? Seda ei saa tagasi võtta.</T>
          <Row>
            <Btn small kind="danger" title="Jah, kustuta kõik" onPress={wipe} />
            <Btn small kind="ghost" title="Ei" onPress={() => setSure(false)} />
          </Row>
        </View>
      ) : (
        <Btn small kind="ghost" title="Kustuta kõik andmed" onPress={() => setSure(true)} style={{ marginTop: 6 }} />
      )}
    </Card>
  );
}

function ParentHome({ onLock }: { onLock: () => void }) {
  const { state, day, removePendingRetake } = useStore();
  const fx = useCelebrate();
  const [prefill, setPrefill] = useState<{ kind: Kind; subject: string; title?: string; n: number } | undefined>();
  const w = weekStats(state, day);
  const pct = w.stepsPlanned ? Math.round((w.stepsDone / w.stepsPlanned) * 100) : 0;
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H size={36}>Lapsevanem</H>
        <Btn small kind="ghost" title="Lukusta" onPress={onLock} />
      </View>
      <Muted style={{ fontSize: 16 }}>Laps seda vaadet ei näe. Hindeid näed e-päevikust, TASA näitab pingutust.</Muted>

      <Section>See nädal</Section>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <Stat n={`${pct}%`} l="sammudest tehtud" />
        <Stat n={String(w.minutes)} l="minutit õpitud" />
        <Stat n={String(w.daysOpened)} l="päeva avatud" />
        <Stat n={String(w.missedDeadlines)} l="tähtaega mööda" />
      </View>

      <Section>Kleebi e-päevikust</Section>
      <PasteImport
        onRetake={(subject) => {
          setPrefill((p) => ({ kind: "retake", subject, n: (p?.n ?? 0) + 1 }));
          fx.toast("Järeltöö on all valmis: vali kuupäev ja lisa kordamisküsimused, kui need on.");
        }}
        onHomework={(subject, title) => {
          setPrefill((p) => ({ kind: "homework", subject, title, n: (p?.n ?? 0) + 1 }));
          fx.toast("Ülesanne on all valmis: vali tähtajaks järgmine tund.");
        }}
      />

      {(state.pendingRetakes ?? []).length ? (
        <>
          <Section>Järeltöö vajalik, kuupäev teadmata</Section>
          <Card>
            {(state.pendingRetakes ?? []).map((r) => (
              <View key={r.id} style={[st.prow, { justifyContent: "space-between" }]}>
                <T style={{ flex: 1, fontSize: 16 }}>{r.subject}</T>
                <Btn
                  small
                  title="Lisa kuupäev"
                  onPress={() => {
                    setPrefill((p) => ({ kind: "retake", subject: r.subject, n: (p?.n ?? 0) + 1 }));
                    fx.toast("Järeltöö on all valmis: vali kuupäev ja lisa kordamisküsimused, kui need on.");
                  }}
                />
                <Btn small kind="ghost" title="Eemalda" onPress={() => removePendingRetake(r.id)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Section>Lisa plaani</Section>
      <AddForm key={prefill?.n ?? 0} prefill={prefill} />

      <Section>Plaanis</Section>
      <PlannedList />

      <Section>Tänased sammud</Section>
      <TodayExcuse />

      <Section>Preemia</Section>
      <RewardSettings />

      <Section>Seaded</Section>
      <Settings />

      <Section>Tunniplaan</Section>
      <Timetable />

      <Section>Andmed ja privaatsus</Section>
      <Privacy />
    </View>
  );
}

function Timetable() {
  const { state, parentUpdate, renameSubject } = useStore();
  const fx = useCelebrate();
  const subjects = knownSubjects(state);
  const [edit, setEdit] = useState<{ from: string; to: string } | null>(null);
  const count = (sub: string) => state.assignments.filter((a) => a.subject.toLowerCase() === sub.toLowerCase()).length;
  const save = () => {
    if (!edit) return;
    const to = edit.to.trim();
    if (!to) return fx.toast("Kirjuta aine nimi.");
    const into = subjects.find((x) => x.toLowerCase() === to.toLowerCase() && x.toLowerCase() !== edit.from.toLowerCase());
    renameSubject(edit.from, to);
    fx.toast(into ? `Liidetud: ${edit.from} → ${into}` : `Nimi muudetud: ${to}`);
    setEdit(null);
  };
  return (
    <Card>
      <Muted>
        TASA õpib tunnipäevad kodutööde tähtaegadest. Kontrolli ja paranda vajadusel: siis saab tegemata töö tähtajaks
        järgmise tunni. Kui aine nimi on valesti loetud, vajuta nimele ja paranda see. Kui kirjutad olemasoleva aine nime,
        liidetakse need kokku.
      </Muted>
      {subjects.length ? (
        subjects.map((sub) => {
          const { days, manual } = lessonDays(state, sub);
          if (edit && edit.from === sub) {
            const others = subjects.filter((x) => x !== sub);
            return (
              <View key={sub} style={[st.rowLine, { gap: 8, paddingVertical: 8 }]}>
                <Field
                  label={`Aine nimi (${count(sub)} ülesannet)`}
                  value={edit.to}
                  onChangeText={(to) => setEdit({ ...edit, to })}
                  autoFocus
                  onSubmitEditing={save}
                />
                {others.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    <Muted>Või liida:</Muted>
                    {others.map((o) => (
                      <Pressable key={o} onPress={() => setEdit({ ...edit, to: o })} accessibilityRole="button" style={st.chip}>
                        <T style={{ fontSize: 14 }}>{o}</T>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <Row>
                  <Btn small title="Salvesta" onPress={save} />
                  <Btn small kind="ghost" title="Loobu" onPress={() => setEdit(null)} />
                </Row>
              </View>
            );
          }
          return (
            <View key={sub} style={[st.prow, st.rowLine, { flexWrap: "wrap" }]}>
              <Pressable
                style={{ flex: 1, minWidth: 120 }}
                accessibilityRole="button"
                accessibilityLabel={`Muuda aine nime: ${sub}`}
                onPress={() => setEdit({ from: sub, to: sub })}
              >
                <T style={{ fontSize: 15 }}>
                  {sub}
                  {!manual && days.length ? <T style={{ color: C.muted, fontSize: 13 }}> (tähtaegade järgi)</T> : null}
                  <T style={{ color: C.lakeInk, fontSize: 13 }}>  ✎</T>
                </T>
              </Pressable>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {WEEKDAY_SHORT.slice(0, 5).map((w, i) => {
                  const on = days.includes(i);
                  return (
                    <Pressable
                      key={w}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${sub}: ${WEEKDAY_NAMES[i]}`}
                      onPress={() => parentUpdate((s) => setDays(s, sub, on ? days.filter((x) => x !== i) : [...days, i]))}
                      style={[st.wd, on && { backgroundColor: C.lake, borderColor: C.lake }]}
                    >
                      <T bold style={{ fontSize: 14, color: on ? C.white : C.ink }}>{w}</T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      ) : (
        <Muted>Aineid veel pole. Need tulevad siia, kui lisad ülesandeid.</Muted>
      )}
    </Card>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, gap: 2, padding: 14 }}>
      <Text style={{ fontFamily: F.display, fontSize: 30, color: C.lakeInk }}>{n}</Text>
      <Muted>{l}</Muted>
    </Card>
  );
}

const st = StyleSheet.create({
  pin: {
    fontFamily: F.bodyBold,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
    color: C.ink,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
    paddingVertical: 10,
    maxWidth: 220,
  },
  dayChip: { borderWidth: 2, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 44, justifyContent: "center", backgroundColor: C.card },
  prow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowLine: { borderTopWidth: 1, borderTopColor: C.line },
  wd: { width: 34, height: 34, borderRadius: 9, borderWidth: 2, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.card },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
});
