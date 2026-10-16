import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";

const chip = { backgroundColor: "#101828DD", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 } as const;

/** Who is online (and editing what), share button, whiteboard drafts, and a short notice toast. */
export function CollabBar({ boardId, publicId, role, editing, drafts, note, onNote }: {
  boardId: any; publicId: string; role?: string; editing?: string; drafts?: boolean; note?: string | null; onNote?: (n: string | null) => void;
}) {
  const ins = useSafeAreaInsets();
  const router = useRouter();
  const me: any = useQuery(api.users.me);
  const beat = useMutation(api.presence.beat);
  const leave = useMutation(api.presence.leave);
  const rows: any[] = useQuery(api.presence.list, { boardId }) ?? [];
  const list: any[] = useQuery(api.drafts.list, drafts ? { boardId } : "skip") ?? [];
  const apply = useMutation(api.drafts.apply);
  const drop = useMutation(api.drafts.remove);
  const [now, setNow] = useState(Date.now());
  const [dlg, setDlg] = useState(false);

  useEffect(() => {
    const go = () => beat({ boardId, editing }).catch(() => {});
    go();
    const t = setInterval(go, 10000);
    return () => clearInterval(t);
  }, [boardId, editing]);
  useEffect(() => () => { leave({ boardId }).catch(() => {}); }, [boardId]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!note) return; const t = setTimeout(() => onNote?.(null), 4000); return () => clearTimeout(t); }, [note]);

  const others = rows.filter((r) => r.userId !== me?._id && now - r.seenAt < 30000);
  return (
    <>
      <View pointerEvents="box-none" style={{ position: "absolute", top: ins.top + 72, right: 12, alignItems: "flex-end", gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {others.map((r) => (
            <View key={r._id} style={chip}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.editing ? "#F79009" : "#12B76A" }} />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{r.name}{r.editing ? ` · ${r.editing}` : ""}</Text>
            </View>
          ))}
          {drafts && list.length > 0 && (
            <Pressable onPress={() => setDlg(true)} style={[chip, { backgroundColor: "#B54708" }]}>
              <MaterialCommunityIcons name="file-clock-outline" size={15} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Drafts {list.length}/5</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push(`/share/${publicId}` as any)} style={chip}>
            <MaterialCommunityIcons name={role === "viewer" ? "eye-outline" : "account-multiple-plus-outline"} size={15} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{role === "viewer" ? "View only" : "Share"}</Text>
          </Pressable>
        </View>
      </View>
      {note && (
        <Pressable onPress={() => onNote?.(null)} style={{ position: "absolute", bottom: 24, alignSelf: "center", maxWidth: "90%", backgroundColor: "#101828", borderRadius: 12, padding: 12 }}>
          <Text style={{ color: "#fff" }}>{note}</Text>
        </Pressable>
      )}
      <Modal transparent animationType="fade" visible={dlg} onRequestClose={() => setDlg(false)}>
        <Pressable onPress={() => setDlg(false)} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "center", padding: 24 }}>
          <Pressable style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, gap: 12, alignSelf: "center", width: "100%", maxWidth: 440 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Your drafts</Text>
            <Text style={{ color: "#475467" }}>These edits were made on an older version of an item. Apply to overwrite the current version, or discard.</Text>
            {list.length === 0 && <Text style={{ color: "#475467" }}>No drafts.</Text>}
            {list.map((d) => (
              <View key={d._id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#EAECF0", borderRadius: 10, padding: 10 }}>
                <Text style={{ flex: 1 }}>{d.kind} · {new Date(d.createdAt).toLocaleTimeString()}</Text>
                <Pressable onPress={async () => { const r: any = await apply({ id: d._id }); if (r?.status === "locked") onNote?.(`${r.by} is editing this item`); }}><Text style={{ color: "#175CD3", fontWeight: "800" }}>Apply</Text></Pressable>
                <Pressable onPress={() => drop({ id: d._id })}><Text style={{ color: "#D92D20", fontWeight: "800" }}>Discard</Text></Pressable>
              </View>
            ))}
            <Pressable onPress={() => setDlg(false)} style={{ alignItems: "center", padding: 10 }}><Text style={{ fontWeight: "700" }}>Close</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
