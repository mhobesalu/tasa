import { AtkinsonHyperlegible_400Regular } from "@expo-google-fonts/atkinson-hyperlegible/400Regular";
import { AtkinsonHyperlegible_700Bold } from "@expo-google-fonts/atkinson-hyperlegible/700Bold";
import { Baloo2_700Bold } from "@expo-google-fonts/baloo-2/700Bold";
import { Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2/800ExtraBold";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { CelebrateProvider } from "./src/components/Celebrate";
import { Logo } from "./src/components/Logo";
import { Onboarding } from "./src/screens/Onboarding";
import { ParentScreen } from "./src/screens/Parent";
import { TodayScreen } from "./src/screens/Today";
import { WeekScreen } from "./src/screens/Week";
import { StoreProvider, useStore } from "./src/store";
import { C, F } from "./src/theme";

type Tab = "today" | "week" | "parent";

export default function App() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreProvider>
        <CelebrateProvider>
          <Shell />
        </CelebrateProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("today");
  const [unlocked, setUnlocked] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  // Leaving the parent tab always locks it again.
  const go = (t: Tab) => {
    if (t !== "parent") setUnlocked(false);
    setTab(t);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  useEffect(() => {
    if (!state.setupDone) {
      setTab("today");
      setUnlocked(false);
    }
  }, [state.setupDone]);

  const body = !state.setupDone ? (
    <Onboarding />
  ) : tab === "today" ? (
    <TodayScreen />
  ) : tab === "week" ? (
    <WeekScreen />
  ) : (
    <ParentScreen unlocked={unlocked} setUnlocked={setUnlocked} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingBottom: 32,
            paddingHorizontal: 16,
            maxWidth: 560,
            width: "100%",
            alignSelf: "center",
          }}
        >
          {state.setupDone ? (
            <View style={st.brand}>
              <Logo width={96} />
              <Text style={st.kid}>
                {state.child.name}
                {state.child.grade ? `, ${state.child.grade}` : ""}
              </Text>
            </View>
          ) : null}
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
      {state.setupDone ? (
        <View style={[st.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
          <TabBtn label="Täna" on={tab === "today"} onPress={() => go("today")} icon={(c) => (
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9} />
              <Path d="M8 12.5l3 3 5-6" />
            </Svg>
          )} />
          <TabBtn label="Nädal" on={tab === "week"} onPress={() => go("week")} icon={(c) => (
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round">
              <Rect x={3} y={5} width={18} height={16} rx={3} />
              <Path d="M3 10h18M8 3v4M16 3v4" />
            </Svg>
          )} />
          <TabBtn label="Lapsevanem" on={tab === "parent"} onPress={() => go("parent")} icon={(c) => (
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={5} y={11} width={14} height={10} rx={2.5} />
              <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </Svg>
          )} />
        </View>
      ) : null}
    </View>
  );
}

function TabBtn({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon: (c: string) => React.ReactNode }) {
  const c = on ? C.lakeInk : C.muted;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={onPress} style={st.tab}>
      {icon(c)}
      <Text style={{ color: c, fontFamily: F.bodyBold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  kid: { fontFamily: F.bodyBold, color: C.muted, fontSize: 15 },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 4, minHeight: 52 },
});
