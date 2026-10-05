import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/services/api";
import { platformName } from "@/services/platform";
import { colors } from "@/theme/colors";

export default function Dashboard() {
  const router = useRouter();
  const boards = useQuery(api.boards.list);
  const create = useMutation(api.boards.create);
  const newBoard = async () => router.push(`/board/${await create({ name: `Board ${(boards?.length ?? 0) + 1}` })}`);
  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 56, maxWidth: 720, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: colors.text, fontSize: 34, fontWeight: "800" }}>Your boards</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>Running on {platformName}</Text>
      <Pressable onPress={newBoard} style={{ backgroundColor: colors.accent, padding: 14, borderRadius: 6, marginVertical: 20, alignSelf: "flex-start" }}>
        <Text style={{ color: colors.onAccent, fontWeight: "800" }}>New whiteboard</Text>
      </Pressable>
      <FlatList
        data={boards ?? []}
        keyExtractor={(b) => b._id}
        ListEmptyComponent={<Text style={{ color: colors.muted }}>No boards yet. Create one to start drawing.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/board/${item.publicId}`)}
            style={{ backgroundColor: colors.panel, borderLeftWidth: 5, borderLeftColor: colors.accent, padding: 16, marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
