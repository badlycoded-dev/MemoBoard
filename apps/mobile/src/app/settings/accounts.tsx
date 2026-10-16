import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/services/api";
import { Avatar } from "@/components/account/Avatar";
import { useChangeAvatar } from "@/services/account";
import { SettingsScreen } from "@/components/settings/shared";
import { useBoardTheme } from "@/components/whiteboard/BoardTheme";

function Body() {
  const T = useBoardTheme();
  const me: any = useQuery(api.users.me);
  const update = useMutation(api.users.update);
  const { signOut } = useAuthActions();
  const changeAvatar = useChangeAvatar();
  const [name, setName] = useState<string | null>(null);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Pressable onPress={() => changeAvatar()}><Avatar uri={me?.image} name={me?.name ?? me?.email} size={64} /></Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <TextInput value={name ?? me?.name ?? ""} onChangeText={setName} onBlur={() => name !== null && name.trim() && update({ name: name.trim() })}
          placeholder="Your name" placeholderTextColor="#98A2B3"
          style={{ color: T.text, backgroundColor: T.card, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 10 }} />
        <Text style={{ color: T.text, opacity: 0.6 }}>{me?.email}</Text>
      </View>
      <Pressable onPress={() => signOut()}><Text style={{ color: "#DC2626", fontWeight: "800" }}>Sign out</Text></Pressable>
    </View>
  );
}
export default function AccountSettings() {
  return <SettingsScreen title="Account"><Body /></SettingsScreen>;
}
