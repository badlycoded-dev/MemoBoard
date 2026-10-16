import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/services/api";
import { Avatar } from "@/components/account/Avatar";
import { PasswordInput } from "@/components/account/PasswordInput";
import { useChangeAvatar } from "@/services/account";
import { ConfirmDialog, Dialog, Heading, HoldToDelete, SettingsScreen } from "@/components/settings/shared";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { useSettings } from "@/services/settings";

function Body() {
  const T = useBoardTheme();
  const st = useSettings();
  const me: any = useQuery(api.users.me);
  const update = useMutation(api.users.update);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const changePassword = useAction(api.account.changePassword);
  const { signOut } = useAuthActions();
  const changeAvatar = useChangeAvatar();
  const [name, setName] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmPw, setConfirmPw] = useState(false);
  const [delDlg, setDelDlg] = useState(false);
  const pwField = (k: keyof typeof pw, placeholder: string) => (
    <PasswordInput value={pw[k]} onChangeText={(v) => setPw({ ...pw, [k]: v })} placeholder={placeholder} color={T.text} bg={T.card} border={T.border} muted="#98A2B3" />
  );
  const ask = () => {
    if (!pw.current) return setMsg({ ok: false, text: "Enter your current password." });
    if (pw.next.length < 8) return setMsg({ ok: false, text: "New password must be at least 8 characters." });
    if (pw.next !== pw.again) return setMsg({ ok: false, text: "New passwords do not match." });
    setMsg(null);
    setConfirmPw(true);
  };
  const doChange = async () => {
    try {
      await changePassword({ current: pw.current, next: pw.next });
      setPw({ current: "", next: "", again: "" });
      setMsg({ ok: true, text: "Password changed. Your other devices were signed out." });
    } catch (e: any) {
      setMsg({ ok: false, text: String(e?.message ?? e).replace(/^.*Error:\s*/, "").split("\n")[0] });
    }
  };
  const btn = (label: string, on: () => void, color: string) => (
    <Pressable onPress={on} style={{ padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: color }}><Text style={{ color: "#fff", fontWeight: "800" }}>{label}</Text></Pressable>
  );
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable onPress={() => changeAvatar()}><Avatar uri={me?.image} name={me?.name ?? me?.email} size={64} /></Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <TextInput value={name ?? me?.name ?? ""} onChangeText={setName} onBlur={() => name !== null && name.trim() && update({ name: name.trim() })}
            placeholder="Your name" placeholderTextColor="#98A2B3" style={{ color: T.text, backgroundColor: T.card, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
          <Text style={{ color: T.text, opacity: 0.6 }}>{me?.email}</Text>
        </View>
      </View>

      <Heading text="Change password" />
      <View style={{ gap: 10 }}>
        {pwField("current", "Current password")}
        {pwField("next", "New password")}
        {pwField("again", "Repeat new password")}
        {!!msg && <Text style={{ color: msg.ok ? "#12B76A" : "#F04438" }}>{msg.text}</Text>}
        {btn("Change password", ask, st.accent)}
      </View>

      <Heading text="Session" />
      {btn("Sign out", () => signOut(), "#475467")}

      <Heading text="Danger zone" />
      {btn("Delete account", () => setDelDlg(true), "#B42318")}

      <ConfirmDialog visible={confirmPw} title="Change your password?" body="Your other devices will be signed out." confirm="Change" onConfirm={doChange} onClose={() => setConfirmPw(false)} />
      <Dialog visible={delDlg} onClose={() => setDelDlg(false)}>
        {delDlg && (
          <>
            <Text style={{ color: T.text, fontSize: 18, fontWeight: "800" }}>Delete your account?</Text>
            <Text style={{ color: T.text, opacity: 0.7 }}>You will be signed out everywhere and lose access to your boards. Your boards are kept (suspended) for a limited time, then removed.</Text>
            <HoldToDelete onDone={async () => { setDelDlg(false); await deleteAccount(); signOut().catch(() => {}); }} />
            <Pressable onPress={() => setDelDlg(false)} style={{ padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: T.border }}><Text style={{ color: T.text, fontWeight: "700" }}>Cancel</Text></Pressable>
          </>
        )}
      </Dialog>
    </>
  );
}
export default function AccountSettings() {
  return <SettingsScreen title="Account"><Body /></SettingsScreen>;
}
