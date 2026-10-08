import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setSettings, useSettings } from "@/services/settings";
import { accents } from "@/theme/theme";
import { colors } from "@/theme/colors";

export default function SettingsScreen() {
  const router = useRouter(),
    ins = useSafeAreaInsets(),
    st = useSettings();
  const Seg = ({ k, opts }: { k: "toolbar" | "theme"; opts: [string, string][] }) => (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {opts.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => setSettings({ [k]: v } as any)}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 16,
            alignItems: "center",
            backgroundColor: st[k] === v ? colors.accent : colors.panel,
          }}
        >
          <Text style={{ color: st[k] === v ? colors.onAccent : colors.text, fontWeight: "700" }}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  const H = ({ t }: { t: string }) => (
    <Text style={{ color: colors.text, fontWeight: "700", marginTop: 22, marginBottom: 10 }}>
      {t}
    </Text>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <View
        style={{
          paddingTop: ins.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 14,
          backgroundColor: st.accent,
          borderBottomLeftRadius: 22,
          borderBottomRightRadius: 22,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: "#fff", fontSize: 20 }}>←</Text>
        </Pressable>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <H t="Toolbar position" />
        <Seg
          k="toolbar"
          opts={[
            ["vertical", "Vertical"],
            ["horizontal", "Horizontal"],
          ]}
        />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22 }}>
          <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }}>
            Start with toolbar expanded
          </Text>
          <Switch
            value={st.startExpanded}
            onValueChange={(v) => setSettings({ startExpanded: v })}
          />
        </View>
        <H t="Board theme" />
        <Seg
          k="theme"
          opts={[
            ["light", "Light"],
            ["dark", "Dark"],
          ]}
        />
        <H t="Accent color (header bars)" />
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
                borderColor: st.accent === c ? colors.accent : "transparent",
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
