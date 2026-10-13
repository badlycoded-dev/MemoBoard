import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/services/api";
import { colors } from "@/theme/colors";

const COLS = [
  { key: "todo", title: "To do" },
  { key: "doing", title: "Doing" },
  { key: "done", title: "Done" },
] as const;
type S = (typeof COLS)[number]["key"];

export default function TaskBoard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const board = useQuery(api.boards.byPublicId, { publicId: id });
  const tasks = useQuery(api.tasks.list, board ? { boardId: board._id } : "skip") ?? [];
  const add = useMutation(api.tasks.add);
  const move = useMutation(api.tasks.setStatus);
  const del = useMutation(api.tasks.remove);
  const [draft, setDraft] = useState<Record<S, string>>({ todo: "", doing: "", done: "" });
  const submit = (s: S) => {
    const text = draft[s].trim();
    if (!text || !board) return;
    add({ boardId: board._id, text, status: s });
    setDraft({ ...draft, [s]: "" });
  };
  return (
    <View style={{ flex: 1, paddingTop: 48 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginBottom: 12 }}>
        <Pressable onPress={() => router.replace("/")}><Text style={{ color: colors.accent, fontSize: 22 }}>←</Text></Pressable>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>{board?.name ?? ""}</Text>
      </View>
      <ScrollView horizontal contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}>
        {COLS.map((c, ci) => (
          <View key={c.key} style={{ width: 280, flex: 1, minWidth: 240, backgroundColor: colors.panel, borderRadius: 8, padding: 10 }}>
            <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 8 }}>
              {c.title} ({tasks.filter((t: any) => t.status === c.key).length})
            </Text>
            <ScrollView style={{ flex: 1 }}>
              {tasks.filter((t: any) => t.status === c.key).map((t: any) => (
                <View key={t._id} style={{ backgroundColor: colors.canvas, borderRadius: 6, padding: 10, marginBottom: 8 }}>
                  <Text style={{ color: colors.ink }}>{t.text}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <View style={{ flexDirection: "row", gap: 14 }}>
                      {ci > 0 && <Pressable onPress={() => move({ id: t._id, status: COLS[ci - 1].key })}><Text style={{ color: colors.ink, fontSize: 18 }}>←</Text></Pressable>}
                      {ci < 2 && <Pressable onPress={() => move({ id: t._id, status: COLS[ci + 1].key })}><Text style={{ color: colors.ink, fontSize: 18 }}>→</Text></Pressable>}
                    </View>
                    <Pressable onPress={() => del({ id: t._id })}><Text style={{ color: "#E4572E", fontSize: 16 }}>✕</Text></Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TextInput
              value={draft[c.key]}
              onChangeText={(v) => setDraft({ ...draft, [c.key]: v })}
              onSubmitEditing={() => submit(c.key)}
              placeholder="+ Add task"
              placeholderTextColor={colors.muted}
              style={{ color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 8 }}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
