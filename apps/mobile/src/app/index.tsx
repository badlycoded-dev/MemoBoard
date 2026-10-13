import { Pressable, ScrollView, Text, View } from "react-native";
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
  const open = (id: string) => router.push(kind === "task" ? `/task/${id}` : `/board/${id}`);
  const add = async () => open(await create({ name: `${title.slice(0, -1)} ${items.length + 1}`, type: kind }));
  return (
    <View style={{ marginBottom: 32 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>{title}</Text>
        <Pressable onPress={add} style={{ backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 }}>
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
