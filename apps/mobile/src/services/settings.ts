import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useState } from "react";

// Tiny persisted settings store. Add future settings to this type.
export type Settings = {
  toolbar: "vertical" | "horizontal";
  /** Keeps the toolbar permanently expanded and hides its collapse arrow. */
  showFullToolbar: boolean;
  headerStyle: "hanging" | "roundy";
  /** Screen corner the toolbar is anchored to; it also decides the toolbar side/edge. */
  toolbarAnchor: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Screen rotation: follow the device or lock to one orientation. */
  orientation: "auto" | "portrait" | "landscape";
  theme: "light" | "dark";
  accent: string;
  /** Default look of task boards (a board can override it). */
  taskTheme: string;
  /** Name written to task logs / claims. */
  userName: string;
  /** Shows the trash bin as an extra column on every task board. */
  showTrash: boolean;
};

const KEY = "memoboard.settings";
let current: Settings = {
  toolbar: "vertical",
  showFullToolbar: false,
  headerStyle: "hanging",
  toolbarAnchor: "top-left",
  orientation: "auto",
  theme: "light",
  accent: "#2F5BA8",
  taskTheme: "blueprint",
  userName: "me",
  showTrash: false,
};
const LOCKS = {
  auto: ScreenOrientation.OrientationLock.DEFAULT,
  portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  landscape: ScreenOrientation.OrientationLock.LANDSCAPE,
};
const applyOrientation = (mode: Settings["orientation"]) =>
  ScreenOrientation.lockAsync(LOCKS[mode]).catch(() => {});

const subscribers = new Set<(s: Settings) => void>();
const publish = () => subscribers.forEach((notify) => notify(current));

export const ready: Promise<void> = AsyncStorage.getItem(KEY)
  .then((saved) => {
    if (saved) {
      current = { ...current, ...JSON.parse(saved) };
      publish();
    }
    applyOrientation(current.orientation);
  })
  .catch(() => {});

export const getSettings = () => current;

export const setSettings = (patch: Partial<Settings>) => {
  current = { ...current, ...patch };
  AsyncStorage.setItem(KEY, JSON.stringify(current));
  if (patch.orientation) applyOrientation(patch.orientation);
  publish();
};

export const useSettings = () => {
  const [settings, set] = useState(current);
  useEffect(() => {
    subscribers.add(set);
    set(current);
    return () => {
      subscribers.delete(set);
    };
  }, []);
  return settings;
};
