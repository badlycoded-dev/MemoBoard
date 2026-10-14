import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/services/api";
import { platformName } from "@/services/platform";
import { colors } from "@/theme/colors";

type Kind = "whiteboard" | "task";

function Section({ title, kind, label }: { title: string; kind: Kind; label: string }) {
  const router = useRouter();
  const boards = useQuery(api.boards.list);
  const create = useMutation(api.boards.create);
  const items = (boards ?? []).filter((b: any) => (b.type ?? "whiteboard") === kind);
  const open = (id: string) => router.push((kind === "task" ? `/task/${id}` : `/board/${id}`) as any);
  const [dlg, setDlg] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"progress" | "multi">("progress");
  const [count, setCount] = useState(4);
  const add = async () => open(await create({ name: `${title.slice(0, -1)} ${items.length + 1}`, type: kind }));
  const NAMES: Record<number, string[]> = {
    3: ["Ideas", "Open", "Done"],
    4: ["Ideas", "Open", "In progress", "Done"],
    5: ["Ideas", "Open", "In progress", "Review", "Done"],
  };
  const createTask = async () => {
    setDlg(false);
    open(await create({ name: name.trim() || `Task board ${items.length + 1}`, type: "task", mode, columns: mode === "multi" ? NAMES[count] : undefined }));
    setName("");
  };
  const pill = (label: string, on: boolean, press: () => void) => (
    <Pressable key={label} onPress={press} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: colors.accent, backgroundColor: on ? colors.accent : "transparent" }}>
      <Text style={{ color: on ? colors.onAccent : colors.text, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginBottom: 32 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>{title}</Text>
        <Pressable onPress={kind === "task" ? () => setDlg(true) : add} style={{ backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 }}>
          <Text style={{ color: colors.onAccent, fontWeight: "800" }}>{label}</Text>
        </Pressable>
      </View>
      {items.length === 0 && <Text style={{ color: colors.muted }}>Nothing here yet.</Text>}
      {items.map((b: any) => (
        <Pressable key={b._id} onPress={() => open(b.publicId)}
          style={{ backgroundColor: colors.panel, borderLeftWidth: 5, borderLeftColor: colors.accent, padding: 16, marginBottom: 10 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{b.name}</Text>
          <Text style={{ color: colors.muted, marginTop: 2 }}>{new Date(b.createdAt).toLocaleDateString()}</Text>
        </Pressable>
      ))}
      <Modal transparent animationType="fade" visible={dlg} onRequestClose={() => setDlg(false)}>
        <Pressable onPress={() => setDlg(false)} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Pressable style={{ width: "100%", maxWidth: 420, backgroundColor: colors.panel, borderRadius: 16, padding: 20, gap: 14 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>New task board</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Board name" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 }} />
            <Text style={{ color: colors.muted }}>Mode</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {pill("Progress", mode === "progress", () => setMode("progress"))}
              {pill("Multi-list", mode === "multi", () => setMode("multi"))}
            </View>
            <Text style={{ color: colors.muted }}>
              {mode === "progress" ? "To do / Doing / Done. Claiming and finishing move tasks along; everything is logged." : "Free columns you can add, rename, reorder and delete. Create, claim and finish tasks."}
            </Text>
            {mode === "multi" && (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Text style={{ color: colors.muted }}>Columns</Text>
                {[3, 4, 5].map((n) => pill(String(n), count === n, () => setCount(n)))}
              </View>
            )}
            <Pressable onPress={createTask} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 10, alignItems: "center" }}>
              <Text style={{ color: colors.onAccent, fontWeight: "800" }}>Create</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function Dashboard() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>Running on {platformName}</Text>
      <Section title="Whiteboards" kind="whiteboard" label="New whiteboard" />
      <Section title="Task boards" kind="task" label="New task board" />
    </ScrollView>
  );
}
