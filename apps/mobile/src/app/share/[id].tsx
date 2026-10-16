import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
  const create = useMutation(api.members.createInvite), revoke = useMutation(api.members.revokeInvite);
  const [role, setRole2] = useState<"editor" | "viewer">("editor");
  const [hours, setHours] = useState<number | undefined>(168);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
