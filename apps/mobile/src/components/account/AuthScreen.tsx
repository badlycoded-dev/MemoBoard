import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { colors } from "@/theme/colors";
import { useOnline } from "./OfflineBanner";

WebBrowser.maybeCompleteAuthSession();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen() {
  const { signIn } = useAuthActions();
  const online = useOnline();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [f, setF] = useState({ name: "", email: "", email2: "", password: "", password2: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [methodError, setMethodError] = useState(false);
  const up = mode === "up";
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const submit = async () => {
    setErr("");
    if (!online) return setErr("No internet connection.");
    if (!EMAIL.test(f.email.trim())) return setErr("Enter a valid email address.");
    if (up) {
      if (f.email.trim().toLowerCase() !== f.email2.trim().toLowerCase()) return setErr("Emails do not match.");
      if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
      if (f.password !== f.password2) return setErr("Passwords do not match.");
    }
    setBusy(true);
    try {
      await signIn("password", { email: f.email.trim(), password: f.password, name: f.name.trim(), flow: up ? "signUp" : "signIn" });
    } catch {
      setErr(up ? "Could not create the account (the email may already be used)." : "Wrong email or password.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr("");
    if (!online) return setErr("No internet connection.");
    try {
      if (Platform.OS === "web") return void (await signIn("google"));
      const redirectTo = Linking.createURL("/");
      const { redirect } = await signIn("google", { redirectTo });
      const res = await WebBrowser.openAuthSessionAsync(String(redirect), redirectTo);
      if (res.type === "success") {
        const code = new URL(res.url).searchParams.get("code");
        if (code) await signIn("google", { code });
      }
    } catch {
      setErr("Google sign-in failed. Try again.");
    }
  };

  const input = (k: keyof typeof f, placeholder: string, extra: object = {}) => (
    <TextInput
      value={f[k]} onChangeText={set(k)} placeholder={placeholder} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false}
      style={{ color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, backgroundColor: colors.ink }} {...extra}
    />
  );
  const social = (icon: any, label: string, on: () => void) => (
    <Pressable onPress={on} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.line }}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.text} />
      <Text style={{ color: colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 400, backgroundColor: colors.panel, borderRadius: 18, padding: 22, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>MemoBoard</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["in", "up"] as const).map((m) => (
            <Pressable key={m} onPress={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: 10, borderRadius: 10, alignItems: "center", backgroundColor: mode === m ? colors.accent : "transparent", borderWidth: 1.5, borderColor: colors.accent }}>
              <Text style={{ color: mode === m ? colors.onAccent : colors.text, fontWeight: "800" }}>{m === "in" ? "Log in" : "Sign up"}</Text>
            </Pressable>
          ))}
        </View>
        {up && input("name", "Name", { autoCapitalize: "words" })}
        {input("email", "Email", { keyboardType: "email-address", textContentType: "emailAddress" })}
        {up && input("email2", "Repeat email", { keyboardType: "email-address" })}
        {input("password", "Password", { secureTextEntry: true })}
        {up && input("password2", "Repeat password", { secureTextEntry: true })}
        {!!err && <Text style={{ color: "#F87171" }}>{err}</Text>}
        <Pressable onPress={submit} disabled={busy} style={{ backgroundColor: colors.accent, padding: 13, borderRadius: 10, alignItems: "center", opacity: online ? 1 : 0.5 }}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontWeight: "800" }}>{up ? "Create account" : "Log in"}</Text>}
        </Pressable>
        <Text style={{ color: colors.muted, textAlign: "center" }}>or</Text>
        {social("google", "Continue with Google", google)}
        {social("github", "Continue with GitHub", () => setMethodError(true))}
      </View>
      <Modal transparent animationType="fade" visible={methodError} onRequestClose={() => setMethodError(false)}>
        <Pressable onPress={() => setMethodError(false)} style={{ flex: 1, backgroundColor: "#0009", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.panel, borderRadius: 16, padding: 20, maxWidth: 340, gap: 14 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>Error</Text>
            <Text style={{ color: colors.text }}>An error occurred while calling the selected authentication method.</Text>
            <Pressable onPress={() => setMethodError(false)} style={{ alignSelf: "flex-end", padding: 10 }}><Text style={{ color: colors.accent, fontWeight: "800" }}>OK</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
