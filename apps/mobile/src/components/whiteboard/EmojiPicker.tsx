import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥳",
  "😎",
  "🤔",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "🎉",
  "❤️",
  "💔",
  "⭐",
  "✅",
  "❌",
  "⚠️",
  "❓",
  "💡",
  "📌",
  "📎",
  "📅",
  "📝",
  "💬",
  "🚀",
  "🎯",
  "🏆",
  "🍕",
  "☕",
  "🌈",
  "🌞",
  "🌙",
  "🐱",
  "🐶",
  "🦊",
  "🍀",
  "🎵",
  "📷",
  "🔒",
  "🔔",
  "💻",
  "📱",
  "🧠",
];

type Props = { visible: boolean; onClose: () => void; onPick: (emoji: string) => void };

/** Grid of common emojis; a picked emoji is added to the board as a large text item. */
export function EmojiPicker({ visible, onClose, onPick }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <View style={styles.grid}>
            {EMOJIS.map((emoji) => (
              <Pressable key={emoji} onPress={() => onPick(emoji)} style={styles.cell}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#0008" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  cell: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 28 },
});
