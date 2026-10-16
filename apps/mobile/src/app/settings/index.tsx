import { Pressable, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SettingsScreen } from "@/components/settings/shared";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";

const PAGES = [
  ["whiteboards", "Whiteboards", "draw"],
  ["tasks", "Task boards", "view-column-outline"],
  ["accounts", "Account", "account-circle-outline"],
] as const;

function Hub() {
  const router = useRouter();
  const T = useBoardTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  // Opened from a board: that board type + account. From the main menu: account only.
  const pages = PAGES.filter(([path]) => path === "accounts" || path === from);
  return (
    <>
      {pages.map(([path, label, icon]) => (
        <Pressable key={path} onPress={() => router.push(`/settings/${path}` as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, marginBottom: 12, borderRadius: 16, backgroundColor: T.card, borderWidth: 1, borderColor: T.border }}>
          <MaterialCommunityIcons name={icon as any} size={26} color={T.text} />
          <Text style={{ color: T.text, fontWeight: "700", fontSize: 16, flex: 1 }}>{label}</Text>
          <MaterialCommunityIcons name="chevron-right" size={24} color={T.text} />
        </Pressable>
      ))}
    </>
  );
}
export default function SettingsHub() {
  return <SettingsScreen title="Settings"><HubInner /></SettingsScreen>;
}
const HubInner = Hub;
