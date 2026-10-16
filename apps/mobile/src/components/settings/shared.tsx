import { ReactNode, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/services/api";
import { BoardHeader } from "@/components/whiteboard/BoardHeader";
import { BoardThemeProvider, useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { Settings, setSettings, useSettings } from "@/services/settings";

export type ChoiceKey = "headerStyle" | "toolbar" | "toolbarAnchor" | "orientation" | "theme";

export function Heading({ text }: { text: string }) {
  const T = useBoardTheme();
  return <Text style={{ color: T.text, fontWeight: "700", marginTop: 22, marginBottom: 10 }}>{text}</Text>;
}

export function Choice({ k, options }: { k: ChoiceKey; options: [string, string][] }) {
  const T = useBoardTheme();
  const st = useSettings();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {options.map(([value, label]) => {
        const active = st[k] === value;
        return (
          <Pressable key={value} onPress={() => setSettings({ [k]: value } as Partial<Settings>)}
            style={{ flexGrow: 1, flexBasis: options.length > 2 ? "45%" : "40%", padding: 12, borderRadius: 16, alignItems: "center", backgroundColor: active ? st.accent : T.card, borderWidth: 1, borderColor: active ? st.accent : T.border }}>
            <Text style={{ color: active ? "#fff" : T.text, fontWeight: "700" }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Inner({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const st = useSettings();
  const T = useBoardTheme();
  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: ins.top + 76, paddingBottom: 60 }}>{children}</ScrollView>
      <BoardHeader title={title} accent={st.accent} variant={st.headerStyle} topInset={ins.top} onBack={() => router.back()} />
    </View>
  );
}

/** Shared frame for every settings page. */
export function SettingsScreen({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useSettings();
  return <BoardThemeProvider mode={theme}><Inner title={title}>{children}</Inner></BoardThemeProvider>;
}

/** Press and hold to confirm; the fill animates and fires onDone when full. */
export function HoldToDelete({ onDone, ms = 1500 }: { onDone: () => void; ms?: number }) {
  const p = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const done = useRef(false);
  const start = () => {
    anim.current = Animated.timing(p, { toValue: 1, duration: ms, useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished && !done.current) { done.current = true; onDone(); } });
  };
  const stop = () => {
    anim.current?.stop();
    if (!done.current) Animated.timing(p, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };
  return (
    <Pressable onPressIn={start} onPressOut={stop} style={{ height: 50, borderRadius: 12, overflow: "hidden", backgroundColor: "#7A271A", justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#F04438", width: p.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
      <Text style={{ color: "#fff", fontWeight: "800" }}>Hold to delete</Text>
    </Pressable>
  );
}

export function Dialog({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const T = useBoardTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable style={{ width: "100%", maxWidth: 420, backgroundColor: T.card, borderRadius: 16, padding: 20, gap: 14 }}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}

/** Yes/cancel confirmation modal. */
export function ConfirmDialog({ visible, title, body, confirm = "Confirm", onConfirm, onClose }: {
  visible: boolean; title: string; body?: string; confirm?: string; onConfirm: () => void; onClose: () => void;
}) {
  const T = useBoardTheme();
  const st = useSettings();
  return (
    <Dialog visible={visible} onClose={onClose}>
      <Text style={{ color: T.text, fontSize: 18, fontWeight: "800" }}>{title}</Text>
      {!!body && <Text style={{ color: T.text, opacity: 0.7 }}>{body}</Text>}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: T.border }}><Text style={{ color: T.text, fontWeight: "700" }}>Cancel</Text></Pressable>
        <Pressable onPress={() => { onClose(); onConfirm(); }} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: st.accent }}><Text style={{ color: "#fff", fontWeight: "800" }}>{confirm}</Text></Pressable>
      </View>
    </Dialog>
  );
}

/** Lists the user's boards of one kind with rename and hold-to-delete. */
export function BoardManager({ kind }: { kind: "whiteboard" | "task" }) {
  const T = useBoardTheme();
  const st = useSettings();
  const boards: any[] | undefined = useQuery(api.boards.list);
  const rename = useMutation(api.boards.rename);
  const remove = useMutation(api.boards.remove);
  const [ren, setRen] = useState<any>(null);
  const [name, setName] = useState("");
  const [del, setDel] = useState<any>(null);
  const items = (boards ?? []).filter((b) => (b.type ?? "whiteboard") === kind && b.role === "owner"); // shared boards are managed by their owners
  const save = async () => { if (name.trim()) await rename({ id: ren._id, name: name.trim() }); setRen(null); };
  const btn = (label: string, on: () => void, primary = false) => (
    <Pressable onPress={on} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: primary ? st.accent : "transparent", borderWidth: 1, borderColor: primary ? st.accent : T.border }}>
      <Text style={{ color: primary ? "#fff" : T.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      {boards && items.length === 0 && <Text style={{ color: T.text, opacity: 0.6 }}>No boards yet.</Text>}
      {items.map((b) => (
        <View key={b._id} style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: T.card, borderColor: T.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
          <Text style={{ color: T.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{b.name}</Text>
          <Pressable hitSlop={8} onPress={() => { setName(b.name); setRen(b); }}><MaterialCommunityIcons name="pencil-outline" size={22} color={T.text} /></Pressable>
          <Pressable hitSlop={8} onPress={() => setDel(b)}><MaterialCommunityIcons name="trash-can-outline" size={22} color="#DC2626" /></Pressable>
        </View>
      ))}
      <Dialog visible={!!ren} onClose={() => setRen(null)}>
        <Text style={{ color: T.text, fontSize: 18, fontWeight: "800" }}>Rename board</Text>
        <TextInput value={name} onChangeText={setName} autoFocus onSubmitEditing={save} placeholder="Board title" placeholderTextColor="#98A2B3"
          style={{ color: T.text, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
        <View style={{ flexDirection: "row", gap: 10 }}>{btn("Cancel", () => setRen(null))}{btn("Save", save, true)}</View>
      </Dialog>
      <Dialog visible={!!del} onClose={() => setDel(null)}>
        {del && (
          <>
            <Text style={{ color: T.text, fontSize: 18, fontWeight: "800" }}>Delete “{del.name}”?</Text>
            <Text style={{ color: T.text, opacity: 0.7 }}>The board and everything on it will be permanently deleted.</Text>
            <HoldToDelete key={del._id} onDone={() => { const id = del._id; setDel(null); remove({ id }); }} />
            {btn("Cancel", () => setDel(null))}
          </>
        )}
      </Dialog>
    </View>
  );
}
