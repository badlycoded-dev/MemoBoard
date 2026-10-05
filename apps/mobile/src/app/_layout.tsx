import { Stack } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { colors } from "@/theme/colors";
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });
export default function Root() {
  return (
    <ConvexProvider client={convex}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }} />
    </ConvexProvider>
  );
}
