import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BLUE } from "@/theme/theme";
import { useBoardTheme } from "./BoardTheme";
import { PAL } from "./constants";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** Round toolbar button; `sel` marks the active tool. */
export function ToolButton({ icon, on, sel }: { icon: IconName; on: () => void; sel?: boolean }) {
  const T = useBoardTheme();
  return (
    <Pressable onPress={on} style={[styles.tool, { backgroundColor: sel ? T.sel : "transparent" }]}>
      <MaterialCommunityIcons name={icon} size={22} color={sel ? BLUE : T.text} />
    </Pressable>
  );
}

/** Row of preset color circles. */
export function ColorSwatches({ v, on }: { v: string; on: (color: string) => void }) {
  return (
    <View style={styles.swatches}>
      {PAL.map((c) => (
        <Pressable
          key={c}
          onPress={() => on(c)}
          style={[styles.swatch, { backgroundColor: c, borderColor: c === v ? BLUE : "#C5CFE6" }]}
        />
      ))}
    </View>
  );
}

type StepperProps = {
  label: string;
  v: number;
  set: (n: number) => void;
  min: number;
  max: number;
  step?: number;
};

/** "label  −  value  +" control for small integer settings. */
export function Stepper({ label, v, set, min, max, step = 1 }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Pressable onPress={() => set(Math.max(min, v - step))} style={styles.stepBtn}>
        <Text style={styles.stepGlyph}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{v}</Text>
      <Pressable onPress={() => set(Math.min(max, v + step))} style={styles.stepBtn}>
        <Text style={styles.stepGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tool: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  glyph: { fontSize: 20 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6 },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 3 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  stepLabel: { color: "#1c2b4a", width: 84 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#DFE7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { width: 30, textAlign: "center", color: "#1c2b4a" },
  stepGlyph: { fontSize: 18 },
});
