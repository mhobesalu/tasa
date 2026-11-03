import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { C, F } from "../theme";

type Kind = "confetti" | "fireworks" | "emoji" | "star" | "balloons";
const ONE: Kind[] = ["confetti", "fireworks", "emoji", "star", "balloons"];
const COLS = [C.lake, C.sun, C.boat, C.violetInk, "#7ED3CF"];
const EMOJI = ["🎉", "⭐", "🚀", "💪", "✨", "🚣", "🌟"];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

interface Burst {
  id: number;
  kind: Kind;
  delay: number;
}

interface Ctx {
  one: () => void;
  all: () => void;
  toast: (msg: string) => void;
}
const CelebrateCtx = createContext<Ctx>({ one: () => {}, all: () => {}, toast: () => {} });
export const useCelebrate = () => useContext(CelebrateCtx);

export function CelebrateProvider({ children }: { children: React.ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const seq = useRef(0);
  const i = useRef(0);
  const reduce = useRef(false);
  const toastA = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduce.current = v)).catch(() => {});
  }, []);

  const add = useCallback((kinds: Kind[]) => {
    if (reduce.current) return;
    const now = kinds.map((kind, k) => ({ id: ++seq.current, kind, delay: k * 150 }));
    setBursts((b) => [...b, ...now]);
  }, []);
  const done = useCallback((id: number) => setBursts((b) => b.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (m: string) => {
      setMsg(m);
      AccessibilityInfo.announceForAccessibility?.(m);
      toastA.setValue(0);
      Animated.timing(toastA, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastA, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setMsg(null));
      }, 2600);
    },
    [toastA],
  );

  const ctx: Ctx = {
    one: () => add([ONE[i.current++ % ONE.length]]),
    all: () => add(["confetti", "fireworks", "emoji", "balloons", "star", "confetti"]),
    toast,
  };

  return (
    <CelebrateCtx.Provider value={ctx}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bursts.map((b) => (
          <BurstView key={b.id} burst={b} onEnd={() => done(b.id)} />
        ))}
      </View>
      {msg ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            st.toast,
            {
              opacity: toastA,
              transform: [{ translateY: toastA.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Text style={st.toastText}>{msg}</Text>
        </Animated.View>
      ) : null}
    </CelebrateCtx.Provider>
  );
}

function BurstView({ burst, onEnd }: { burst: Burst; onEnd: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  const { width: W, height: H } = useWindowDimensions();
  const dur = { confetti: 1800, fireworks: 1500, emoji: 2600, star: 1300, balloons: 3600 }[burst.kind];
  const parts = useRef(makeParts(burst.kind, W, H)).current;

  useEffect(() => {
    const a = Animated.timing(t, {
      toValue: 1,
      duration: dur,
      delay: burst.delay,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    a.start(() => onEnd());
    return () => a.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (burst.kind === "star") {
    const scale = t.interpolate({ inputRange: [0, 0.2, 0.4, 0.8, 1], outputRange: [0, 1.2, 1, 1, 0.9] });
    const opacity = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
    const ty = t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, -60] });
    return (
      <Animated.Text
        style={{
          position: "absolute",
          left: W / 2 - 70,
          top: H * 0.35 - 70,
          width: 140,
          textAlign: "center",
          fontSize: 120,
          lineHeight: 140,
          opacity,
          transform: [{ translateY: ty }, { scale }],
        }}
      >
        ⭐
      </Animated.Text>
    );
  }

  return (
    <>
      {parts.map((p, k) => {
        const tx = t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        const ty = t.interpolate({ inputRange: p.yIn, outputRange: p.yOut });
        const opacity = t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
        const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin}deg`] });
        const base = { position: "absolute" as const, left: p.x, top: p.y, opacity };
        if (p.emoji) {
          return (
            <Animated.Text key={k} style={[base, { fontSize: p.size, transform: [{ translateX: tx }, { translateY: ty }] }]}>
              {p.emoji}
            </Animated.Text>
          );
        }
        if (burst.kind === "balloons") {
          return (
            <Animated.View key={k} style={[base, { alignItems: "center", transform: [{ translateX: tx }, { translateY: ty }] }]}>
              <View style={{ width: p.size * 1.6, height: p.size * 2, borderRadius: p.size, backgroundColor: p.color }} />
              <View style={{ width: 1, height: p.size * 1.6, backgroundColor: "rgba(120,120,120,.6)" }} />
            </Animated.View>
          );
        }
        return (
          <Animated.View
            key={k}
            style={[
              base,
              {
                width: p.w,
                height: p.h,
                borderRadius: burst.kind === "fireworks" ? p.w : 2,
                backgroundColor: p.color,
                transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

interface Part {
  x: number;
  y: number;
  dx: number;
  yIn: number[];
  yOut: number[];
  spin: number;
  w: number;
  h: number;
  size: number;
  color: string;
  emoji?: string;
}

function makeParts(kind: Kind, W: number, H: number): Part[] {
  const out: Part[] = [];
  const base = { spin: 0, w: 0, h: 0, size: 0, color: C.lake };
  if (kind === "confetti") {
    for (let i = 0; i < 70; i++) {
      const up = rnd(H * 0.15, H * 0.35);
      out.push({
        ...base,
        x: W / 2 + rnd(-30, 30),
        y: H * 0.45,
        dx: rnd(-W * 0.55, W * 0.55),
        yIn: [0, 0.3, 1],
        yOut: [0, -up, H * rnd(0.35, 0.6)],
        spin: rnd(-720, 720),
        w: rnd(6, 11),
        h: rnd(4, 7),
        color: pick(COLS),
      });
    }
  } else if (kind === "fireworks") {
    for (let b = 0; b < 3; b++) {
      const cx = rnd(0.2, 0.8) * W;
      const cy = rnd(0.15, 0.4) * H;
      const color = pick(COLS);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const r = rnd(70, 130);
        out.push({
          ...base,
          x: cx,
          y: cy,
          dx: Math.cos(a) * r,
          yIn: [0, 0.6, 1],
          yOut: [0, Math.sin(a) * r * 0.9, Math.sin(a) * r + 30],
          w: 6,
          h: 6,
          color,
        });
      }
    }
  } else if (kind === "emoji") {
    for (let i = 0; i < 26; i++) {
      out.push({
        ...base,
        x: rnd(0, W - 30),
        y: rnd(-260, -40),
        dx: rnd(-20, 20),
        yIn: [0, 1],
        yOut: [0, H + 300],
        size: rnd(24, 40),
        emoji: pick(EMOJI),
      });
    }
  } else if (kind === "balloons") {
    for (let i = 0; i < 12; i++) {
      out.push({
        ...base,
        x: rnd(0.05, 0.9) * W,
        y: H + rnd(20, 200),
        dx: rnd(-30, 30),
        yIn: [0, 1],
        yOut: [0, -H - 400],
        size: rnd(18, 26),
        color: pick(COLS),
      });
    }
  }
  return out;
}

const st = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 110,
    alignItems: "center",
  },
  toastText: {
    backgroundColor: C.ink,
    color: C.paper,
    fontFamily: F.bodyBold,
    fontSize: 17,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 99,
    overflow: "hidden",
    textAlign: "center",
  },
});
