// Task board looks. Pick a default in Settings; each board can override it from its header.
export type TaskTheme = {
  name: string;
  bg: string; // page
  col: string; // column surface
  colText: string;
  colBorder: string;
  card: string;
  cardText: string;
  muted: string;
  accent: string;
  radius: number; // card radius
  colRadius: number;
  cardBorder: number; // default card border width
  dark: boolean; // markdown / modal palette
};

export const TASK_THEMES: Record<string, TaskTheme> = {
  blueprint: { name: "Blueprint", bg: "#12275C", col: "#1B3A80", colText: "#EAF0FF", colBorder: "#3B5BA8", card: "#EEF3FA", cardText: "#12275C", muted: "#5B6B91", accent: "#FFD23F", radius: 14, colRadius: 18, cardBorder: 1, dark: false },
  paper: { name: "Paper", bg: "#F5F1E8", col: "#EAE3D2", colText: "#3B3A36", colBorder: "#D6CDB5", card: "#FFFFFF", cardText: "#2B2A27", muted: "#8A8574", accent: "#C2410C", radius: 6, colRadius: 8, cardBorder: 1, dark: false },
  midnight: { name: "Midnight", bg: "#0B1020", col: "#141B34", colText: "#E2E8F0", colBorder: "#27325A", card: "#1C2547", cardText: "#E8ECFF", muted: "#8B97C4", accent: "#7C9CFF", radius: 12, colRadius: 16, cardBorder: 1, dark: true },
  sticky: { name: "Sticky", bg: "#C9A66B", col: "#B58E52", colText: "#3A2A10", colBorder: "#8F6C36", card: "#FFF3A8", cardText: "#3A2A10", muted: "#7A6A2E", accent: "#D9480F", radius: 3, colRadius: 4, cardBorder: 0, dark: false },
  mint: { name: "Mint", bg: "#E7F5EE", col: "#CDEBDD", colText: "#14532D", colBorder: "#9FD5BB", card: "#FFFFFF", cardText: "#14342A", muted: "#5E8C78", accent: "#0E9F6E", radius: 20, colRadius: 24, cardBorder: 1, dark: false },
};

export const IMPORTANCE = [
  { label: "Low", color: "#94A3B8" },
  { label: "Normal", color: "#3B82F6" },
  { label: "High", color: "#F59E0B" },
  { label: "Critical", color: "#DC2626" },
];

export const ITEM_COLORS = ["#6D35D8", "#3B82F6", "#0E9F6E", "#F59E0B", "#E4572E", "#DB2777", "#0891B2", "#334155"];
