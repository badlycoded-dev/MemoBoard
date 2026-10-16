import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/account/Avatar";
import { api } from "@/services/api";

/** Short notice at the bottom of the screen; tap to dismiss. */
export function Toast({ note, onNote }: { note?: string | null; onNote: (n: string | null) => void }) {
  useEffect(() => { if (!note) return; const t = setTimeout(() => onNote(null), 4000); return () => clearTimeout(t); }, [note]);
  if (!note) return null;
  return (
    <Pressable onPress={() => onNote(null)} style={{ position: "absolute", bottom: 24, alignSelf: "center", maxWidth: "90%", backgroundColor: "#101828", borderRadius: 12, padding: 12 }}>
      <Text style={{ color: "#fff" }}>{note}</Text>
    </Pressable>
  );
}

/** Header actions: [drafts] [active users] [share]. Also sends this user's presence heartbeat. */
export function CollabBar({ boardId, publicId, role, editing, drafts, onNote, tint = "rgba(255,255,255,0.22)", fg = "#fff" }: {
  boardId: any; publicId: string; role?: string; editing?: string; drafts?: boolean; onNote?: (n: string | null) => void; tint?: string; fg?: string;
}) {
  const router = useRouter();
  const me: any = useQuery(api.users.me);
  const beat = useMutation(api.presence.beat);
  const leave = useMutation(api.presence.leave);
  const rows: any[] = useQuery(api.presence.list, { boardId }) ?? [];
  const list: any[] = useQuery(api.drafts.list, drafts ? { boardId } : "skip") ?? [];
  const apply = useMutation(api.drafts.apply);
  const drop = useMutation(api.drafts.remove);
  const [now, setNow] = useState(Date.now());
  const [dlg, setDlg] = useState<null | "drafts" | "users">(null);

  useEffect(() => {
    const go = () => beat({ boardId, editing }).catch(() => {});
    go();
    const t = setInterval(go, 10000);
    return () => clearInterval(t);
  }, [boardId, editing]);
  useEffect(() => () => { leave({ boardId }).catch(() => {}); }, [boardId]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(t); }, []);

  const active = rows.filter((r) => now - r.seenAt < 30000).sort((a, b) => (a.userId === me?._id ? -1 : b.userId === me?._id ? 1 : 0));
  const others = active.filter((r) => r.userId !== me?._id);
  const pill = { backgroundColor: tint, borderRadius: 18, height: 34, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 } as const;
  const close = () => setDlg(null);
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {drafts && list.length > 0 && (
          <Pressable onPress={() => setDlg("drafts")} style={[pill, { backgroundColor: "#B54708" }]}>
            <MaterialCommunityIcons name="file-clock-outline" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{list.length}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setDlg("users")} style={pill}>
          {others.length === 0 ? (
            <MaterialCommunityIcons name="account-group-outline" size={18} color={fg} />
          ) : (
            <View style={{ flexDirection: "row" }}>
              {others.slice(0, 3).map((r, i) => (
                <View key={r._id} style={{ marginLeft: i ? -8 : 0, borderRadius: 12, borderWidth: 2, borderColor: tint.startsWith("rgba(255") ? "#ffffff55" : "transparent" }}>
                  <Avatar uri={r.image} name={r.name} size={22} />
                </View>
              ))}
            </View>
          )}
          {others.length > 3 && <Text style={{ color: fg, fontSize: 12, fontWeight: "800" }}>+{others.length - 3}</Text>}
        </Pressable>
        <Pressable onPress={() => router.push(`/share/${publicId}` as any)} style={pill}>
          <MaterialCommunityIcons name={role === "viewer" ? "eye-outline" : "account-multiple-plus-outline"} size={18} color={fg} />
        </Pressable>
      </View>

      <Modal transparent animationType="fade" visible={dlg !== null} onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "center", padding: 24 }}>
          <Pressable style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, gap: 12, alignSelf: "center", width: "100%", maxWidth: 440 }}>
            {dlg === "users" ? (
              <>
                <Text style={{ fontSize: 18, fontWeight: "800" }}>Active now ({active.length})</Text>
                {active.length === 0 && <Text style={{ color: "#475467" }}>Nobody is here yet.</Text>}
                {active.map((r) => (
                  <View key={r._id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar uri={r.image} name={r.name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700" }} numberOfLines={1}>{r.name}{r.userId === me?._id ? " (you)" : ""}</Text>
                      <Text style={{ color: "#475467", fontSize: 12 }}>{r.editing ? `Editing ${r.editing}` : "Viewing"}</Text>
                    </View>
                    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: r.editing ? "#F79009" : "#12B76A" }} />
                  </View>
                ))}
              </>
            ) : (
              <>
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
              </>
            )}
            <Pressable onPress={close} style={{ alignItems: "center", padding: 10 }}><Text style={{ fontWeight: "700" }}>Close</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
