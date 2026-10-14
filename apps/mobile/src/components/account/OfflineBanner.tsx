import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const useOnline = () => useNetInfo().isConnected !== false;

/** Chrome-style black bar shown at the top while the device is offline. */
export function OfflineBanner() {
  const online = useOnline();
  const ins = useSafeAreaInsets();
  if (online) return null;
  return (
    <View style={{ backgroundColor: "#000", paddingTop: ins.top + 6, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <MaterialCommunityIcons name="cloud-off-outline" size={18} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 14 }}>No internet connection</Text>
    </View>
  );
}
