import React, { useState } from "react";
import { View } from "react-native";
import { useStore } from "../store";
import type { Assignment } from "../types";
import { useCelebrate } from "./Celebrate";
import { Btn, Field, Row, T } from "./ui";

/** "Mis leheküljest mis leheküljeni?" for a reading task; TASA then plans exact pages per day. */
export function PagesAsk({ a, compact, onDone }: { a: Assignment; compact?: boolean; onDone?: () => void }) {
  const { setPages } = useStore();
  const fx = useCelebrate();
  const [from, setFrom] = useState(a.pageFrom ? String(a.pageFrom) : "");
  const [to, setTo] = useState(a.pageTo ? String(a.pageTo) : "");
  const f = parseInt(from, 10), t = parseInt(to, 10);
  const ok = f > 0 && t >= f;
  return (
    <View style={{ gap: 6 }}>
      {compact ? null : <T style={{ fontSize: 15 }}>{a.subject}: {a.title}</T>}
      <Row style={{ alignItems: "flex-end" }}>
        <Field label="Alates lk" value={from} onChangeText={(v) => setFrom(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={4} placeholder="nt 41" />
        <Field label="Kuni lk" value={to} onChangeText={(v) => setTo(v.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={4} placeholder="nt 120" />
        <Btn
          small
          title="Salvesta"
          disabled={!ok}
          onPress={() => {
            setPages(a.id, f, t);
            fx.toast(`Leheküljed ${f}–${t} jagatud päevade peale.`);
            onDone?.();
          }}
        />
      </Row>
    </View>
  );
}
