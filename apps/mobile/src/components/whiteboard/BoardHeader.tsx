import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useBoardTheme } from "./BoardTheme";

type Props = {
  title: string;
  accent: string;
  /** "hanging" = full-width bar, "roundy" = floating Telegram-like pills. */
  variant: "hanging" | "roundy";
  topInset: number;
  onBack: () => void;
  /** Optional right-hand button (the board header opens Settings; Settings omits it). */
  onSettings?: () => void;
  /** Extra actions shown on the right, before the settings gear. */
  right?: ReactNode;
};

export function BoardHeader({ title, accent, variant, topInset, onBack, onSettings, right }: Props) {
  const T = useBoardTheme();
  const back = <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />;
  const gear = <MaterialCommunityIcons name="cog-outline" size={22} color="#fff" />;

  if (variant === "hanging") {
    return (
      <View style={[styles.hanging, { paddingTop: topInset + 8, backgroundColor: accent }]}>
        <Pressable onPress={onBack}>{back}</Pressable>
        <Text style={styles.hangingTitle} numberOfLines={1}>
          {title}
        </Text>
        {right}
        {onSettings && <Pressable onPress={onSettings}>{gear}</Pressable>}
      </View>
    );
  }

  // The strip behind the pills is translucent (a real blur would need expo-blur).
  const strip = T.dark ? "rgba(15,23,42,0.55)" : "rgba(238,243,250,0.7)";
  return (
    <View style={[styles.roundyBar, { paddingTop: topInset + 8, backgroundColor: strip }]}>
      <Pressable onPress={onBack} style={[styles.round, { backgroundColor: accent }]}>
        {back}
      </Pressable>
      <View style={[styles.pill, { backgroundColor: accent, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 3 }]}>
        <Text style={[styles.pillTitle, { flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {onSettings && (
        <Pressable onPress={onSettings} style={[styles.round, { backgroundColor: accent }]}>
          {gear}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hanging: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hangingTitle: { color: "#fff", fontWeight: "700", fontSize: 17, flex: 1 },
  roundyBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: { flex: 1, height: 40, borderRadius: 20, justifyContent: "center", paddingHorizontal: 16 },
  pillTitle: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
