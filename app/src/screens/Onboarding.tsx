import React, { useState } from "react";
import { Switch, View } from "react-native";
import { Logo } from "../components/Logo";
import { Btn, Card, Field, H, Muted, Row, T } from "../components/ui";
import { useStore } from "../store";
import { C } from "../theme";

export function Onboarding() {
  const { finishSetup } = useStore();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [sample, setSample] = useState(true);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!name.trim()) return setErr("Kirjuta lapse nimi.");
    if (!/^\d{4}$/.test(pin)) return setErr("PIN-kood peab olema 4 numbrit.");
    if (pin !== pin2) return setErr("PIN-koodid ei ole samad.");
    await finishSetup({ name: name.trim(), grade: grade.trim(), pin, sample });
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: "center", gap: 6, marginTop: 10 }}>
        <Logo width={200} />
        <T style={{ color: C.muted, fontStyle: "italic" }}>Tasa sõuad, kaugele jõuad.</T>
      </View>
      <H size={28}>Tere tulemast!</H>
      <T style={{ lineHeight: 23 }}>
        TASA aitab lapsel koduste töödega alustada. Laps näeb ainult tänast päeva ja ühte asja korraga. Suured tööd jagatakse umbes 25-minutilisteks sammudeks.
      </T>
      <Muted>Selle seadistab lapsevanem. Perele on TASA alati tasuta.</Muted>

      <Card>
        <Row>
          <Field label="Lapse nimi" value={name} onChangeText={setName} placeholder="nt Mia" maxLength={20} />
          <Field label="Klass" value={grade} onChangeText={setGrade} placeholder="nt 7.b" maxLength={10} style={{ maxWidth: 110 }} />
        </Row>
        <Row>
          <Field
            label="Vanema PIN-kood"
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="4 numbrit"
          />
          <Field
            label="PIN uuesti"
            value={pin2}
            onChangeText={(v) => setPin2(v.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="4 numbrit"
          />
        </Row>
        <Muted>PIN-kood kaitseb vanema vaadet. Laps seda vaadet ei näe.</Muted>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Switch value={sample} onValueChange={setSample} trackColor={{ true: C.lake, false: C.line }} accessibilityLabel="Alusta näidisülesannetega" />
          <T style={{ flex: 1 }}>Alusta näidisülesannetega (saad need hiljem eemaldada)</T>
        </View>
        {err ? <T style={{ color: C.boatInk }}>{err}</T> : null}
        <Btn title="Alusta" onPress={go} />
      </Card>

      <Muted>
        Kõik andmed on ainult selles telefonis. E-päeviku (eKool, Stuudium) ühendus tuleb hiljem, kooli loal. Seni lisab ülesanded lapsevanem.
      </Muted>
    </View>
  );
}
