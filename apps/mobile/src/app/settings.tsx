import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BoardHeader } from "@/components/whiteboard/BoardHeader";
import { BoardThemeProvider, useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { Settings, setSettings, useSettings } from "@/services/settings";
import { accents } from "@/theme/theme";

type ChoiceKey = "headerStyle" | "toolbar" | "toolbarAnchor" | "orientation" | "theme";

function Heading({ text }: { text: string }) {
  const T = useBoardTheme();
  return (
    <Text style={{ color: T.text, fontWeight: "700", marginTop: 22, marginBottom: 10 }}>
      {text}
    </Text>
  );
}

/** Wrapping row of mutually exclusive options bound to one setting. */
function Choice({ k, options }: { k: ChoiceKey; options: [string, string][] }) {
  const T = useBoardTheme();
  const st = useSettings();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {options.map(([value, label]) => {
        const active = st[k] === value;
        return (
          <Pressable
            key={value}
            onPress={() => setSettings({ [k]: value } as Partial<Settings>)}
            style={{
              flexGrow: 1,
              flexBasis: options.length > 2 ? "45%" : "40%",
              padding: 12,
              borderRadius: 16,
              alignItems: "center",
              backgroundColor: active ? st.accent : T.card,
              borderWidth: 1,
              borderColor: active ? st.accent : T.border,
            }}
          >
            <Text style={{ color: active ? "#fff" : T.text, fontWeight: "700" }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsContent() {
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const st = useSettings();
  const T = useBoardTheme();

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: ins.top + 76 }}>
        <Heading text="Header style" />
        <Choice
          k="headerStyle"
          options={[
            ["hanging", "Hanging"],
            ["roundy", "Roundy"],
          ]}
        />

        <Heading text="Toolbar orientation" />
        <Choice
          k="toolbar"
          options={[
            ["vertical", "Vertical"],
            ["horizontal", "Horizontal"],
          ]}
        />

        <Heading text="Toolbar anchor corner" />
        <Choice
          k="toolbarAnchor"
          options={[
            ["top-left", "Top left"],
            ["top-right", "Top right"],
            ["bottom-left", "Bottom left"],
            ["bottom-right", "Bottom right"],
          ]}
        />

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22 }}>
          <Text style={{ color: T.text, fontWeight: "700", flex: 1 }}>Show full toolbar</Text>
          <Switch
            value={st.showFullToolbar}
            onValueChange={(value) => setSettings({ showFullToolbar: value })}
            trackColor={{ true: st.accent }}
          />
        </View>

        <Heading text="App orientation" />
        <Choice
          k="orientation"
          options={[
            ["auto", "Auto"],
            ["portrait", "Portrait"],
            ["landscape", "Landscape"],
          ]}
        />

        <Heading text="Board theme" />
        <Choice
          k="theme"
          options={[
            ["light", "Light"],
            ["dark", "Dark"],
          ]}
        />

        <Heading text="Accent color (headers)" />
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          {accents.map((c) => (
            <Pressable
              key={c}
              onPress={() => setSettings({ accent: c })}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: st.accent === c ? T.text : "transparent",
              }}
            />
          ))}
        </View>
      </ScrollView>
      <BoardHeader
        title="Settings"
        accent={st.accent}
        variant={st.headerStyle}
        topInset={ins.top}
        onBack={() => router.back()}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { theme } = useSettings();
  return (
    <BoardThemeProvider mode={theme}>
      <SettingsContent />
    </BoardThemeProvider>
  );
}
