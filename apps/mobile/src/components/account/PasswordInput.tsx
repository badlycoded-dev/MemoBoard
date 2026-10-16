import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

/** Password field with an eye button that shows what is being typed. */
export function PasswordInput({ value, onChangeText, placeholder, color, bg, border, muted }: {
  value: string; onChangeText: (v: string) => void; placeholder: string; color: string; bg: string; border: string; muted: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: border, borderRadius: 10, backgroundColor: bg }}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={muted} secureTextEntry={!show}
        autoCapitalize="none" autoCorrect={false} style={{ flex: 1, color, padding: 12 }} />
      <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} style={{ paddingHorizontal: 12 }}>
        <MaterialCommunityIcons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={muted} />
      </Pressable>
    </View>
  );
}
