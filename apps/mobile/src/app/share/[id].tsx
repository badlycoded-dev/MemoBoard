import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { TextInput } from "react-native";
import { Pressable, Text, View } from "react-native";
import { api } from "@/services/api";
import { Heading, SettingsScreen } from "@/components/settings/shared";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { useSettings } from "@/services/settings";

const EXPIRY: [string, number | undefined][] = [["1 day", 24], ["7 days", 168], ["Never", undefined]];

function Body() {
  const T = useBoardTheme();
  const st = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const board: any = useQuery(api.boards.byPublicId, { publicId: id });
  const me: any = useQuery(api.users.me);
  const members: any[] = useQuery(api.members.list, board ? { boardId: board._id } : "skip") ?? [];
  const owner = board?.role === "owner";
  const invites: any[] = useQuery(api.members.invites, owner ? { boardId: board._id } : "skip") ?? [];
  const setRole = useMutation(api.members.setRole), kick = useMutation(api.members.remove);
  const setAccess = useMutation(api.boards.setAccess);
  const create = useMutation(api.members.createInvite), revoke = useMutation(api.members.revokeInvite);
  const [role, setRole2] = useState<"editor" | "viewer">("editor");
  const [hours, setHours] = useState<number | undefined>(168);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const found: any = useQuery(api.members.findUser, board && owner && searched ? { boardId: board._id, email: searched } : "skip");
  const pending: any[] = useQuery(api.members.boardInvites, owner ? { boardId: board._id } : "skip") ?? [];
  const inviteUser = useMutation(api.members.inviteUser), cancelInvite = useMutation(api.members.cancelInvite);
  if (!board) return <Text style={{ color: T.text }}>Board not found.</Text>;

  const pill = (label: string, active: boolean, on: () => void) => (
    <Pressable key={label} onPress={on} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: active ? st.accent : T.card, borderWidth: 1, borderColor: active ? st.accent : T.border }}>
      <Text style={{ color: active ? "#fff" : T.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
  const make = async () => {
    const token = await create({ boardId: board._id, role, expiresInHours: hours });
    const url = Linking.createURL(`/join/${token}`);
    setLink(url); setCopied(false);
    await Clipboard.setStringAsync(url); setCopied(true);
  };
  return (
    <>
      <Text style={{ color: T.text, fontSize: 20, fontWeight: "800" }}>{board.name}</Text>
      <Text style={{ color: T.text, opacity: 0.6 }}>Your role: {board.role}</Text>

      <Heading text="People" />
      <View style={{ gap: 8 }}>
        {members.map((m) => (
          <View key={m.userId} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.card, borderColor: T.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: T.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{m.name}{m.userId === me?._id ? " (you)" : ""}</Text>
            {m.role === "owner" || !owner ? (
              <Text style={{ color: T.text, opacity: 0.7 }}>{m.role}</Text>
            ) : (
              <>
                {pill("Editor", m.role === "editor", () => setRole({ boardId: board._id, userId: m.userId, role: "editor" }))}
                {pill("Viewer", m.role === "viewer", () => setRole({ boardId: board._id, userId: m.userId, role: "viewer" }))}
              </>
            )}
            {((owner && m.role !== "owner") || (!owner && m.userId === me?._id)) && (
              <Pressable onPress={() => kick({ boardId: board._id, userId: m.userId })}><Text style={{ color: "#DC2626", fontWeight: "800" }}>{owner ? "Remove" : "Leave"}</Text></Pressable>
            )}
          </View>
        ))}
      </View>

      {owner && (
        <>
          <Heading text="Who can open this board" />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {([[2, "Members only"], [3, "Anyone with the link"], [4, "Public"]] as const).map(([a, l]) => pill(l, board.access === a, () => setAccess({ id: board._id, access: a }).catch(() => {})))}
          </View>
          <Text style={{ color: T.text, opacity: 0.6, marginTop: 8 }}>
            {board.access === 2 ? "Only people you invite can open it." : "Signed-in people with the link can view it (read-only). Invite them to let them edit."}
          </Text>
          {board.access >= 3 && (
            <Pressable onPress={() => Clipboard.setStringAsync(Linking.createURL(`/${board.type === "task" ? "task" : "board"}/${board.publicId}`))} style={{ marginTop: 10, padding: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: T.border }}>
              <Text style={{ color: T.text, fontWeight: "700" }}>Copy view-only link</Text>
            </Pressable>
          )}

          <Heading text="Invite a person" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={email} onChangeText={(v) => { setEmail(v); setSearched(""); setInviteErr(""); }} placeholder="Their email" placeholderTextColor="#98A2B3" autoCapitalize="none" keyboardType="email-address"
              style={{ flex: 1, color: T.text, backgroundColor: T.card, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
            <Pressable onPress={() => setSearched(email.trim().toLowerCase())} style={{ paddingHorizontal: 16, borderRadius: 10, justifyContent: "center", backgroundColor: st.accent }}><Text style={{ color: "#fff", fontWeight: "800" }}>Find</Text></Pressable>
          </View>
          {!!searched && found === null && <Text style={{ color: T.text, opacity: 0.7, marginTop: 8 }}>No user with that email (or they are already on this board).</Text>}
          {found && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Text style={{ color: T.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>{found.name}</Text>
              {pill("Editor", role === "editor", () => setRole2("editor"))}
              {pill("Viewer", role === "viewer", () => setRole2("viewer"))}
              <Pressable onPress={async () => { try { await inviteUser({ boardId: board._id, userId: found.userId, role }); setEmail(""); setSearched(""); } catch (e: any) { setInviteErr(String(e?.message ?? e).replace(/^.*Error:\s*/, "").split("\n")[0]); } }}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 14, backgroundColor: st.accent }}><Text style={{ color: "#fff", fontWeight: "800" }}>Invite</Text></Pressable>
            </View>
          )}
          {!!inviteErr && <Text style={{ color: "#F04438", marginTop: 6 }}>{inviteErr}</Text>}
          {pending.map((i) => (
            <View key={i._id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
              <Text style={{ color: T.text, flex: 1 }}>{i.name} · invited as {i.role} (pending)</Text>
              <Pressable onPress={() => cancelInvite({ id: i._id })}><Text style={{ color: "#DC2626", fontWeight: "800" }}>Cancel</Text></Pressable>
            </View>
          ))}

          <Heading text="Invite link" />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {pill("Editor", role === "editor", () => setRole2("editor"))}
            {pill("Viewer", role === "viewer", () => setRole2("viewer"))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {EXPIRY.map(([l, h]) => pill(`Expires: ${l}`, hours === h, () => setHours(h)))}
          </View>
          <Pressable onPress={make} style={{ marginTop: 12, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: st.accent }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Create and copy link</Text>
          </Pressable>
          {link && <Text selectable style={{ color: T.text, marginTop: 10 }}>{copied ? "Copied. " : ""}{link}</Text>}
          {invites.length > 0 && <Heading text="Active links" />}
          {invites.map((i) => (
            <View key={i._id} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}>
              <Text style={{ color: T.text, flex: 1 }}>{i.role} · used {i.uses}{i.maxUses ? `/${i.maxUses}` : ""} · {i.expiresAt ? `until ${new Date(i.expiresAt).toLocaleDateString()}` : "no expiry"}</Text>
              <Pressable onPress={() => revoke({ id: i._id })}><Text style={{ color: "#DC2626", fontWeight: "800" }}>Revoke</Text></Pressable>
            </View>
          ))}
        </>
      )}
    </>
  );
}
export default function Share() {
  return <SettingsScreen title="Sharing"><Body /></SettingsScreen>;
}
