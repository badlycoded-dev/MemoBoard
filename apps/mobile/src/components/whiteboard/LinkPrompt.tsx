import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BLUE } from "@/theme/theme";

type Props = { visible: boolean; onClose: () => void; onAdd: (url: string) => void };

/** Small dialog that asks for the address of a new link item. */
export function LinkPrompt({ visible, onClose, onAdd }: Props) {
  const [url, setUrl] = useState("");
  const submit = () => {
    if (!url.trim()) return;
    onAdd(url);
    setUrl("");
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add link</Text>
          <TextInput
            autoFocus
            value={url}
            onChangeText={setUrl}
            placeholder="https://"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <View style={styles.row}>
            <Pressable onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.add}>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0008" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 18 },
  title: { fontWeight: "700", fontSize: 16, color: "#1c2b4a", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    padding: 10,
    color: "#1c2b4a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 18,
    marginTop: 14,
  },
  cancel: { color: "#1c2b4a" },
  add: { backgroundColor: BLUE, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 22 },
  addText: { color: "#fff", fontWeight: "700" },
});
