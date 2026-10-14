import { Stack } from "expo-router";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthScreen } from "@/components/account/AuthScreen";
import { OfflineBanner, useOnline } from "@/components/account/OfflineBanner";
import { colors } from "@/theme/colors";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });
const secureStorage = { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync };

function Gate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const online = useOnline();
  // The saved session token is read from device storage; with no token we show log in / sign up.
  if (isLoading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <ActivityIndicator color={colors.accent} />
        {!online && <Text style={{ color: colors.muted }}>Waiting for a connection…</Text>}
      </View>
    );
  if (!isAuthenticated) return <AuthScreen />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }} />;
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <ConvexAuthProvider client={convex} storage={Platform.OS === "web" ? undefined : secureStorage}>
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
          <OfflineBanner />
          <Gate />
        </View>
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}
