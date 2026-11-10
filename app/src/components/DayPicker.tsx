import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { addDays, relDate, shortDate, type Day } from "../dates";
import { C } from "../theme";
import { T } from "./ui";

export function DayPicker({ label, value, onChange, from, refDay, days = 21 }: { label: string; value: Day; onChange: (d: Day) => void; from: Day; refDay: Day; days?: number }) {
  return (
    <View style={{ gap: 4 }}>
      <T style={{ color: C.muted, fontSize: 14 }}>{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
        {Array.from({ length: days }, (_, i) => addDays(from, i)).map((d) => {
          const on = d === value;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(d)}
              style={[st.chip, on && { borderColor: C.lake, backgroundColor: C.lakeSoft }]}
            >
              <T bold={on} style={{ fontSize: 14 }}>{["täna", "homme"].includes(relDate(d, refDay)) ? relDate(d, refDay) : shortDate(d)}</T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  chip: { borderWidth: 2, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minHeight: 44, justifyContent: "center", backgroundColor: C.card },
});
