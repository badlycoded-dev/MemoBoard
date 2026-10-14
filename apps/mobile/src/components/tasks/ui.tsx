import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { TaskTheme } from "@/theme/taskThemes";

type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export type Opt = { label: string; icon?: Icon; on: () => void; danger?: boolean };

/** Bottom-sheet style option list (the "select with options" of a task / column menu). */
export function ActionSheet({ title, options, onClose, th }: { title?: string; options: Opt[] | null; onClose: () => void; th: TaskTheme }) {
  if (!options) return null;
  const bg = th.dark ? "#1C2547" : "#FFFFFF", fg = th.dark ? "#E8ECFF" : "#1F2328";
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable style={{ width: "100%", maxWidth: 360, maxHeight: "80%", backgroundColor: bg, borderRadius: 16, paddingVertical: 8 }}>
          {title ? <Text style={{ color: fg, opacity: 0.6, paddingHorizontal: 18, paddingVertical: 8, fontWeight: "700" }}>{title}</Text> : null}
          <ScrollView>
            {options.map((o) => (
              <Pressable key={o.label} onPress={() => { onClose(); o.on(); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 13 }}>
                {o.icon && <MaterialCommunityIcons name={o.icon} size={20} color={o.danger ? "#DC2626" : fg} />}
                <Text style={{ color: o.danger ? "#DC2626" : fg, fontSize: 16 }}>{o.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Small text prompt (rename column, new column, ...). */
export function Prompt({ title, initial = "", visible, onSubmit, onClose, th }: { title: string; initial?: string; visible: boolean; onSubmit: (v: string) => void; onClose: () => void; th: TaskTheme }) {
  const [v, setV] = useState(initial);
  useEffect(() => { if (visible) setV(initial); }, [visible, initial]);
  const bg = th.dark ? "#1C2547" : "#FFFFFF", fg = th.dark ? "#E8ECFF" : "#1F2328";
  const go = () => { if (v.trim()) { onSubmit(v.trim()); onClose(); } };
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable style={{ width: "100%", maxWidth: 360, backgroundColor: bg, borderRadius: 16, padding: 18, gap: 12 }}>
          <Text style={{ color: fg, fontWeight: "800", fontSize: 17 }}>{title}</Text>
          <TextInput autoFocus value={v} onChangeText={setV} onSubmitEditing={go} style={{ color: fg, borderWidth: 1, borderColor: th.colBorder, borderRadius: 10, padding: 10 }} />
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
            <Pressable onPress={onClose} style={{ padding: 10 }}><Text style={{ color: fg }}>Cancel</Text></Pressable>
            <Pressable onPress={go} style={{ padding: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: th.accent }}><Text style={{ color: "#fff", fontWeight: "700" }}>OK</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const Chip = ({ label, on, active, color, fg }: { label: string; on: () => void; active?: boolean; color: string; fg?: string }) => (
  <Pressable onPress={on} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 2, borderColor: color, backgroundColor: active ? color : "transparent" }}>
    <Text style={{ color: active ? "#fff" : fg ?? color, fontWeight: "700", fontSize: 13 }}>{label}</Text>
  </Pressable>
);
