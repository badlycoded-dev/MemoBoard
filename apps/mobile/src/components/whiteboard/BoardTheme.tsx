import { createContext, ReactNode, useContext, useMemo } from "react";
import type { ViewStyle } from "react-native";
import { INK, themes } from "@/theme/theme";

type Mode = keyof typeof themes;

const PANEL_BASE: ViewStyle = {
  position: "absolute",
  borderRadius: 22,
  padding: 6,
  borderWidth: 1,
  elevation: 4,
  shadowColor: "#101828",
  shadowOpacity: 0.1,
  shadowRadius: 8,
};

function buildTheme(mode: Mode) {
  const palette = themes[mode];
  const dark = mode === "dark";
  return {
    ...palette,
    dark,
    /** The default navy ink is unreadable on the dark canvas, so it is drawn near-white there. */
    vis: (color: string) =>
      dark && color?.toLowerCase() === INK.toLowerCase() ? "#F8FAFC" : color,
    /** Style shared by every floating toolbar and panel. */
    panel: {
      ...PANEL_BASE,
      backgroundColor: palette.card,
      borderColor: palette.border,
    } as ViewStyle,
  };
}

export type BoardTheme = ReturnType<typeof buildTheme>;

const ThemeContext = createContext<BoardTheme>(buildTheme("light"));

export const useBoardTheme = () => useContext(ThemeContext);

export function BoardThemeProvider({ mode, children }: { mode: Mode; children: ReactNode }) {
  const value = useMemo(() => buildTheme(mode), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
