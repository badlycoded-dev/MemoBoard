import { Pressable, Switch, Text, View } from "react-native";
import { BoardManager, Choice, Heading, SettingsScreen } from "@/components/settings/shared";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { setSettings, useSettings } from "@/services/settings";
import { accents } from "@/theme/theme";

function Body() {
  const st = useSettings();
  const T = useBoardTheme();
  return (
    <>
      <Heading text="Header style" />
      <Choice k="headerStyle" options={[["hanging", "Hanging"], ["roundy", "Roundy"]]} />
      <Heading text="Toolbar orientation" />
      <Choice k="toolbar" options={[["vertical", "Vertical"], ["horizontal", "Horizontal"]]} />
      <Heading text="Toolbar anchor corner" />
      <Choice k="toolbarAnchor" options={[["top-left", "Top left"], ["top-right", "Top right"], ["bottom-left", "Bottom left"], ["bottom-right", "Bottom right"]]} />
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22 }}>
        <Text style={{ color: T.text, fontWeight: "700", flex: 1 }}>Show full toolbar</Text>
        <Switch value={st.showFullToolbar} onValueChange={(showFullToolbar) => setSettings({ showFullToolbar })} trackColor={{ true: st.accent }} />
      </View>
      <Heading text="App orientation" />
      <Choice k="orientation" options={[["auto", "Auto"], ["portrait", "Portrait"], ["landscape", "Landscape"]]} />
      <Heading text="Board theme" />
      <Choice k="theme" options={[["light", "Light"], ["dark", "Dark"]]} />
      <Heading text="Accent color (headers)" />
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {accents.map((c) => (
          <Pressable key={c} onPress={() => setSettings({ accent: c })} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: 3, borderColor: st.accent === c ? T.text : "transparent" }} />
        ))}
      </View>
      <Heading text="Your whiteboards" />
      <BoardManager kind="whiteboard" />
    </>
  );
}
export default function WhiteboardSettings() {
  return <SettingsScreen title="Whiteboard settings"><Body /></SettingsScreen>;
}
