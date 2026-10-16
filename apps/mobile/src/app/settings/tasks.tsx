import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { BoardManager, Heading, SettingsScreen } from "@/components/settings/shared";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { setSettings, useSettings } from "@/services/settings";
import { TASK_THEMES } from "@/theme/taskThemes";

function Body() {
  const st = useSettings();
  const T = useBoardTheme();
  return (
    <>
      <Heading text="Your name (used in logs and claims)" />
      <TextInput value={st.userName} onChangeText={(userName) => setSettings({ userName })} placeholder="me" placeholderTextColor="#98A2B3"
        style={{ color: T.text, backgroundColor: T.card, borderColor: T.border, borderWidth: 1, borderRadius: 12, padding: 12 }} />
      <Heading text="Default style" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Object.entries(TASK_THEMES).map(([id, th]) => (
          <Pressable key={id} onPress={() => setSettings({ taskTheme: id })}
            style={{ width: 104, borderRadius: 14, overflow: "hidden", borderWidth: 3, borderColor: st.taskTheme === id ? st.accent : T.border }}>
            <View style={{ backgroundColor: th.bg, padding: 8, gap: 5 }}>
              <View style={{ backgroundColor: th.col, borderRadius: th.radius / 2, padding: 5, gap: 4 }}>
                <View style={{ height: 14, borderRadius: th.radius / 3, backgroundColor: th.card, borderTopWidth: 4, borderTopColor: th.accent }} />
                <View style={{ height: 14, borderRadius: th.radius / 3, backgroundColor: th.card }} />
              </View>
            </View>
            <Text style={{ color: T.text, textAlign: "center", padding: 6, fontWeight: "700", backgroundColor: T.card }}>{th.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22 }}>
        <Text style={{ color: T.text, fontWeight: "700", flex: 1 }}>Show trash bin column</Text>
        <Switch value={st.showTrash} onValueChange={(showTrash) => setSettings({ showTrash })} trackColor={{ true: st.accent }} />
      </View>
      <Heading text="Your task boards" />
      <BoardManager kind="task" />
    </>
  );
}
export default function TaskSettings() {
  return <SettingsScreen title="Task board settings"><Body /></SettingsScreen>;
}
