import React from "react";
import { Linking, Pressable, Text, View, type StyleProp, type TextStyle } from "react-native";
import { linkLabel, splitLinks } from "../links";
import { C, F } from "../theme";

const open = (url: string) => Linking.openURL(url).catch(() => {});

/** Text where every web address can be tapped. */
export function LinkText({ text, style, linkColor = C.lakeInk }: { text: string; style?: StyleProp<TextStyle>; linkColor?: string }) {
  const parts = splitLinks(text);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.url ? (
          <Text key={i} accessibilityRole="link" onPress={() => open(p.url!)} style={{ color: linkColor, textDecorationLine: "underline" }}>
            {linkLabel(p.url)}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </Text>
  );
}

/** The links added to a task, one per row. */
export function LinkList({ links, color = C.lakeInk }: { links?: string[]; color?: string }) {
  if (!links?.length) return null;
  return (
    <View style={{ gap: 2 }}>
      {links.map((u) => (
        <Pressable key={u} accessibilityRole="link" accessibilityLabel={`Ava link ${linkLabel(u)}`} onPress={() => open(u)} style={{ minHeight: 40, justifyContent: "center" }}>
          <Text style={{ color, fontFamily: F.bodyBold, fontSize: 15, textDecorationLine: "underline" }} numberOfLines={1}>
            🔗 {linkLabel(u)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
