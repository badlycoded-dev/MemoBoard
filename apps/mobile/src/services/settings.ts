import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
// Tiny persisted settings store. Add future settings to this type.
export type Settings = {
  toolbar: "vertical" | "horizontal";
  startExpanded: boolean;
  theme: "light" | "dark";
  accent: string;
};
const KEY = "memoboard.settings";
let cur: Settings = {
  toolbar: "vertical",
  startExpanded: false,
  theme: "light",
  accent: "#2F5BA8",
};
const subs = new Set<(s: Settings) => void>();
export const ready: Promise<void> = AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v) {
      cur = { ...cur, ...JSON.parse(v) };
      subs.forEach((f) => f(cur));
    }
  })
  .catch(() => {});
export const getSettings = () => cur;
export const setSettings = (p: Partial<Settings>) => {
  cur = { ...cur, ...p };
  AsyncStorage.setItem(KEY, JSON.stringify(cur));
  subs.forEach((f) => f(cur));
};
export const useSettings = () => {
  const [s, set] = useState(cur);
  useEffect(() => {
    subs.add(set);
    set(cur);
    return () => {
      subs.delete(set);
    };
  }, []);
  return s;
};
