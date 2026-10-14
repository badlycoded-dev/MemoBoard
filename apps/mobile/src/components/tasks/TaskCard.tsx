import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { IMPORTANCE, type TaskTheme } from "@/theme/taskThemes";

/** Column item: importance/custom color band on top, title, and an options (dot column) button. */
export function TaskCard({ it, th, onOpen, onMenu }: { it: any; th: TaskTheme; onOpen: () => void; onMenu: () => void }) {
  const imp = IMPORTANCE[it.importance ?? 1];
  const band = it.color ?? imp.color;
  const bw = it.border ?? th.cardBorder;
  return (
    <Pressable
      onPress={onOpen}
      style={{
        backgroundColor: it.tint ? band + "26" : th.card,
        borderRadius: th.radius,
        borderWidth: bw,
        borderColor: it.border != null ? band : th.colBorder,
        overflow: "hidden",
        opacity: it.status === "trashed" ? 0.7 : 1,
      }}
    >
      <View style={{ height: 12, backgroundColor: band, borderBottomLeftRadius: th.radius / 2, borderBottomRightRadius: th.radius / 2 }} />
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text numberOfLines={2} style={{ color: th.cardText, fontWeight: "700", fontSize: 15, textDecorationLine: it.status === "done" ? "line-through" : "none" }}>
            {it.title}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Text style={{ color: band, fontSize: 11, fontWeight: "800" }}>{imp.label.toUpperCase()}</Text>
            {it.claimedBy ? <Text style={{ color: th.muted, fontSize: 11 }}>● {it.claimedBy}</Text> : null}
            {it.status === "done" ? <MaterialCommunityIcons name="check-circle" size={14} color="#0E9F6E" /> : null}
            {it.content ? <MaterialCommunityIcons name="text-box-outline" size={14} color={th.muted} /> : null}
          </View>
        </View>
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onMenu(); }}
          hitSlop={8}
          style={{ width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, borderColor: th.cardText, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialCommunityIcons name="dots-vertical" size={18} color={th.cardText} />
        </Pressable>
      </View>
    </Pressable>
  );
}
