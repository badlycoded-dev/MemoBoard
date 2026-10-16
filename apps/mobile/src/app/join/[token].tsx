import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { api } from "@/services/api";

/** Opened from an invite link: joins the board with the link's role, then opens it. */
export default function Join() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const join = useMutation(api.members.join);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    join({ token })
      .then((r: any) => router.replace((r.type === "task" ? `/task/${r.publicId}` : `/board/${r.publicId}`) as any))
      .catch((e) => setErr(String(e?.message ?? e).replace(/^.*Error:\s*/, "")));
  }, [token]);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 }}>
      {err ? (
        <>
          <Text style={{ color: "#fff", fontSize: 16, textAlign: "center" }}>{err}</Text>
          <Pressable onPress={() => router.replace("/" as any)}><Text style={{ color: "#fff", fontWeight: "800" }}>Go to my boards</Text></Pressable>
        </>
      ) : <ActivityIndicator color="#fff" />}
    </View>
  );
}
