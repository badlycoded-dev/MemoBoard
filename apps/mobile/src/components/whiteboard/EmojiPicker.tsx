import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BLUE } from "@/theme/theme";

const list = (s: string) => s.split(" ");
const GROUPS: Record<string, string[]> = {
  Emoji: list(
    "😀 😂 😍 🥳 😎 🤔 😭 😡 👍 👎 👏 🙏 💪 🔥 ✨ 🎉 ❤️ 💔 ⭐ ✅ ❌ ⚠️ ❓ 💡 📌 📎 📅 📝 💬 🚀 🎯 🏆 🍕 ☕ 🌈 🌞 🌙 🐱 🐶 🦊 🍀 🎵 📷 🔒 🔔 💻 📱 🧠",
  ),
  Math: list(
    "∑ ∏ ∫ ∂ √ ∛ ∞ π ≈ ≠ ≡ ≤ ≥ ± ∓ × ÷ ° ′ ″ ∈ ∉ ⊂ ⊆ ∪ ∩ ∅ ∀ ∃ ∴ ∵ ∠ ⊥ ∥ → ← ↔ ⇒ ⇔ ² ³ ⁿ ⁻ ₁ ₂ ₃ ₄ ½ ¼ ¾ ‰ ∇ ℝ ℕ ℤ ℚ ℂ",
  ),
  Chem: list("→ ⇌ ⇄ ↑ ↓ ⁺ ⁻ ² ³ ⁴ ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ° · ⁰ ¹ Δ ⚗ ☢ ⚛ ± ≈ λ ν"),
  Greek: list("α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω"),
};

/** Horizontal strip of math / chemistry / Greek symbols for the text editor. */
export function SymbolRow({ onPick }: { onPick: (symbol: string) => void }) {
  const symbols = [...GROUPS.Math, ...GROUPS.Chem, ...GROUPS.Greek];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {symbols.map((s, i) => (
        <Pressable key={i} onPress={() => onPick(s)} style={styles.symbol}>
          <Text style={styles.symbolText}>{s}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

type Props = { visible: boolean; onClose: () => void; onPick: (symbol: string) => void };

/** Tabbed grid of emojis and symbols; the picked one is placed on the board as a text item. */
export function EmojiPicker({ visible, onClose, onPick }: Props) {
  const [group, setGroup] = useState("Emoji");
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.tabs}>
            {Object.keys(GROUPS).map((name) => (
              <Pressable
                key={name}
                onPress={() => setGroup(name)}
                style={[styles.tab, group === name && styles.tabOn]}
              >
                <Text style={[styles.tabText, group === name && styles.tabTextOn]}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            <View style={styles.grid}>
              {GROUPS[group].map((symbol, i) => (
                <Pressable key={i} onPress={() => onPick(symbol)} style={styles.cell}>
                  <Text style={styles.emoji}>{symbol}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#0008" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 12 },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#F2F4F7",
  },
  tabOn: { backgroundColor: BLUE },
  tabText: { color: "#1c2b4a", fontWeight: "600", fontSize: 12 },
  tabTextOn: { color: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  cell: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 28, color: "#1c2b4a" },
  row: { marginVertical: 4, flexGrow: 0 },
  symbol: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F7",
    marginRight: 6,
  },
  symbolText: { fontSize: 17, color: "#1c2b4a" },
});
