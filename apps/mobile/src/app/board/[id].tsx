import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/services/api";
import { Canvas } from "@/components/whiteboard/Canvas";
import { colors } from "@/theme/colors";

export default function Whiteboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const board = useQuery(api.boards.byPublicId, { publicId: id });
  const strokes = useQuery(api.strokes.list, board ? { boardId: board._id } : "skip");
  const add = useMutation(api.strokes.add).withOptimisticUpdate((store, a) => {
    const cur = store.getQuery(api.strokes.list, { boardId: a.boardId });
    if (cur) store.setQuery(api.strokes.list, { boardId: a.boardId }, [...cur, { ...a, _id: ("tmp" + Date.now()) as any, _creationTime: 0, userId: "dev", createdAt: 0 }]);
  });
  const undo = useMutation(api.strokes.undo);
  const clear = useMutation(api.strokes.clear);
  const [color, setColor] = useState(colors.pens[0]);
  const [width, setWidth] = useState(4);
  const btn = { paddingVertical: 8, paddingHorizontal: 12 };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 10, paddingTop: 40, backgroundColor: colors.ink, gap: 8, flexWrap: "wrap" }}>
        <Pressable onPress={() => router.replace("/")} style={btn}><Text style={{ color: colors.text, fontWeight: "700" }}>Back</Text></Pressable>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16, flexGrow: 1 }}>{board?.name ?? "Loading..."}</Text>
        {colors.pens.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)}
            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: 3, borderColor: c === color ? colors.accent : colors.line }} />
        ))}
        <Pressable onPress={() => setWidth(width === 4 ? 10 : 4)} style={btn}><Text style={{ color: colors.text }}>{width === 4 ? "Thin" : "Thick"}</Text></Pressable>
        <Pressable onPress={() => board && undo({ boardId: board._id })} style={btn}><Text style={{ color: colors.text }}>Undo</Text></Pressable>
        <Pressable onPress={() => board && clear({ boardId: board._id })} style={btn}><Text style={{ color: colors.accent }}>Clear</Text></Pressable>
      </View>
      {board && (
        <Canvas strokes={strokes ?? []} color={color} width={width}
          onStroke={(s) => add({ boardId: board._id, ...s })} />
      )}
    </View>
  );
}
