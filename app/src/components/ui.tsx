import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, F, R, TAGS, shadow } from "../theme";

export function T({ style, bold, ...p }: React.ComponentProps<typeof Text> & { bold?: boolean }) {
  return <Text {...p} style={[{ fontFamily: bold ? F.bodyBold : F.body, color: C.ink, fontSize: 16 }, style]} />;
}

export function H({ style, size = 30, ...p }: React.ComponentProps<typeof Text> & { size?: number }) {
  return (
    <Text
      accessibilityRole="header"
      {...p}
      style={[{ fontFamily: F.display, color: C.ink, fontSize: size, lineHeight: size * 1.15 }, style]}
    />
  );
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ children }: { children: React.ReactNode }) {
  return <T style={s.sec} bold>{children}</T>;
}

export function Pill({ tag, label }: { tag: keyof typeof TAGS | string; label?: string }) {
  const t = TAGS[tag] ?? TAGS.old;
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontFamily: F.bodyBold, fontSize: 13 }}>{label ?? t.label}</Text>
    </View>
  );
}

type BtnKind = "primary" | "ghost" | "sun" | "danger";
export function Btn({
  title,
  kind = "primary",
  small,
  style,
  disabled,
  icon,
  ...p
}: PressableProps & { title: string; kind?: BtnKind; small?: boolean; style?: StyleProp<ViewStyle>; icon?: React.ReactNode }) {
  const bg = { primary: C.lake, ghost: "transparent", sun: C.sun, danger: C.boatSoft }[kind];
  const fg = { primary: C.white, ghost: C.lakeInk, sun: C.onSun, danger: C.boatInk }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...p}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        kind === "ghost" && { borderWidth: 2, borderColor: C.line },
        style,
      ]}
    >
      <Text style={{ color: fg, fontFamily: F.bodyBold, fontSize: small ? 15 : 18 }}>{title}</Text>
      {icon}
    </Pressable>
  );
}

export function Tick({ size = 22, color = C.white }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Field({
  label,
  style,
  inputStyle,
  ...p
}: TextInputProps & { label: string; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[{ gap: 4, flex: 1 }, style]}>
      <T style={{ color: C.muted, fontSize: 14 }}>{label}</T>
      <TextInput placeholderTextColor="#9AA0AE" {...p} style={[s.input, inputStyle]} accessibilityLabel={label} />
    </View>
  );
}

/** A row of choices, one selected. */
export function Choice<V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      {label ? <T style={{ color: C.muted, fontSize: 14 }}>{label}</T> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[s.choice, on && { borderColor: C.lake, backgroundColor: C.lakeSoft }]}
            >
              <T bold={on} style={{ fontSize: 15 }}>
                {o.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", gap: 10 }, style]}>{children}</View>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <T style={[{ color: C.muted, fontSize: 14, lineHeight: 20 }, style]}>{children}</T>;
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R, padding: 16, gap: 12, ...shadow },
  sec: { marginTop: 22, marginBottom: 8, fontSize: 15, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  pill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  btn: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnSmall: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, alignSelf: "flex-start" },
  input: {
    fontFamily: F.body,
    fontSize: 17,
    color: C.ink,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
    minHeight: 48,
  },
  choice: {
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 44,
    justifyContent: "center",
  },
});
