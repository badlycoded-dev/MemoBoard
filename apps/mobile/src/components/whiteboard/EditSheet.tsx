import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BLUE } from "@/theme/theme";
import { ColorSwatches, Stepper } from "./controls";
import { isArrow } from "./model";

export type EditForm = { id: string; o: any; text: string; code: string; s: any };
type Tab = "text" | "style" | "content";

type Props = {
  form: EditForm | null;
  setForm: (form: EditForm | null) => void;
  file?: { name: string };
  onSave: () => void;
  onDelete: () => void;
  onAttach: () => void;
  onLoadText: () => void;
};

/** Bottom sheet that edits one board item: text, style and content live on separate tabs. */
export function EditSheet({ form, setForm, file, onSave, onDelete, onAttach, onLoadText }: Props) {
  const [tab, setTab] = useState<Tab>("text");
  if (!form) return null;

  const kind: string = form.o.kind;
  const line = isArrow(kind);
  const hasRadius = ["rect", "round", "pin", "code", "image"].includes(kind);
  const hasContent = ["code", "pin", "image"].includes(kind);
  const tabs: [Tab, string][] = [
    ["text", "Text"],
    ["style", "Style"],
    ...(hasContent ? ([["content", "Content"]] as [Tab, string][]) : []),
  ];
  const set = (patch: Partial<EditForm>) => setForm({ ...form, ...patch });
  const setStyle = (patch: object) => set({ s: { ...form.s, ...patch } });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setForm(null)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.tabs}>
            {tabs.map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabOn]}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.body}>
            {tab === "text" && (
              <>
                <TextInput
                  multiline
                  placeholder="Text"
                  value={form.text}
                  onChangeText={(text) => set({ text })}
                  style={styles.input}
                />
                <Stepper
                  label="Text size"
                  v={form.s.fs}
                  min={10}
                  max={72}
                  set={(fs) => setStyle({ fs })}
                />
                <Pressable onPress={() => setStyle({ bold: !form.s.bold })} style={styles.row}>
                  <MaterialCommunityIcons
                    name={form.s.bold ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={20}
                    color={BLUE}
                  />
                  <Text style={styles.label}>Bold text</Text>
                </Pressable>
                <Text style={styles.label}>Text color</Text>
                <ColorSwatches v={form.s.tc} on={(tc) => setStyle({ tc })} />
              </>
            )}

            {tab === "style" && (
              <>
                <Stepper
                  label="Border"
                  v={form.s.sw}
                  min={0}
                  max={24}
                  set={(sw) => setStyle({ sw })}
                />
                {hasRadius && (
                  <Stepper
                    label="Radius"
                    v={form.s.r ?? (kind === "round" ? 18 : 0)}
                    min={0}
                    max={80}
                    set={(r) => setStyle({ r })}
                  />
                )}
                <Text style={styles.label}>{line ? "Line color" : "Border color"}</Text>
                <ColorSwatches v={form.s.stroke} on={(stroke) => setStyle({ stroke })} />
                {!line && (
                  <>
                    <Text style={styles.label}>Fill color</Text>
                    <ColorSwatches v={form.s.fill} on={(fill) => setStyle({ fill })} />
                  </>
                )}
              </>
            )}

            {tab === "content" && (
              <>
                <Text style={styles.label}>Code / text snippet</Text>
                <TextInput
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={form.code}
                  onChangeText={(code) => set({ code })}
                  style={[styles.input, styles.mono]}
                />
                {kind === "code" && (
                  <Pressable onPress={onLoadText} style={styles.row}>
                    <MaterialCommunityIcons name="file-document-outline" size={20} color={BLUE} />
                    <Text style={styles.link}>Load text file…</Text>
                  </Pressable>
                )}
                <Pressable onPress={onAttach} style={styles.row}>
                  <MaterialCommunityIcons name="paperclip" size={20} color={BLUE} />
                  <Text style={styles.link}>
                    {file ? `Replace file (${file.name})` : "Attach file"}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onDelete} style={styles.row}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#D92D20" />
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setForm(null)} style={styles.ghost}>
              <Text style={styles.label}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSave} style={styles.primary}>
              <Text style={styles.primaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const INK = "#1c2b4a";
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" },
  sheet: {
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
    marginBottom: 12,
  },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#F2F4F7",
  },
  tabOn: { backgroundColor: BLUE },
  tabText: { color: INK, fontWeight: "600" },
  tabTextOn: { color: "#fff" },
  body: { marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    padding: 10,
    color: INK,
    marginVertical: 6,
    minHeight: 48,
  },
  mono: { fontFamily: Platform.OS === "android" ? "monospace" : "Courier", minHeight: 120 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  label: { color: INK },
  link: { color: BLUE, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8 },
  delete: { color: "#D92D20", fontWeight: "700" },
  ghost: { paddingVertical: 10, paddingHorizontal: 16 },
  primary: { backgroundColor: BLUE, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 22 },
  primaryText: { color: "#fff", fontWeight: "700" },
});
