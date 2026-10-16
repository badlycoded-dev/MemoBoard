import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from "react-native";
import { api } from "@/services/api";
import { colors } from "@/theme/colors";

const tokenOf = (s: string) => s.trim().match(/join\/([0-9a-f]{32})/i)?.[1] ?? s.trim();

/** Join a board by pasting an invite link/code, or accept an invitation sent to you. */
export function JoinDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const invites: any[] = useQuery(api.members.myInvites) ?? [];
  const join = useMutation(api.members.join);
  const respond = useMutation(api.members.respond);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const open = (r: any) => { onClose(); router.push((r.type === "task" ? `/task/${r.publicId}` : `/board/${r.publicId}`) as any); };
  const fail = (e: any) => setErr(String(e?.message ?? e).replace(/^.*Error:\s*/, "").split("\n")[0]);
  const go = async () => {
    setErr(""); setBusy(true);
    try { open(await join({ token: tokenOf(text) })); setText(""); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const answer = async (id: any, accept: boolean) => {
    setErr("");
    try { const r: any = await respond({ id, accept }); if (accept && r) open(r); } catch (e) { fail(e); }
  };
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable style={{ width: "100%", maxWidth: 440, backgroundColor: colors.panel, borderRadius: 16, padding: 20, gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>Join a board</Text>
          <TextInput value={text} onChangeText={setText} placeholder="Paste an invite link or code" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false}
            style={{ color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 }} />
          <Pressable onPress={go} disabled={!text.trim() || busy} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 10, alignItems: "center", opacity: text.trim() ? 1 : 0.5 }}>
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontWeight: "800" }}>Join</Text>}
          </Pressable>
          {!!err && <Text style={{ color: "#F87171" }}>{err}</Text>}
          <Text style={{ color: colors.muted, marginTop: 6 }}>Pending invitations</Text>
          {invites.length === 0 && <Text style={{ color: colors.muted }}>No invitations.</Text>}
          {invites.map((i) => (
            <View key={i._id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700" }} numberOfLines={1}>{i.board}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{i.from} invited you as {i.role}</Text>
              </View>
              <Pressable onPress={() => answer(i._id, true)}><Text style={{ color: colors.accent, fontWeight: "800" }}>Accept</Text></Pressable>
              <Pressable onPress={() => answer(i._id, false)}><Text style={{ color: "#F87171", fontWeight: "800" }}>Decline</Text></Pressable>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
