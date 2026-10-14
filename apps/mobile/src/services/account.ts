import * as DocumentPicker from "expo-document-picker";
import { useMutation } from "convex/react";
import { api } from "@/services/api";

/** Picks an image, stores it, and sets it as the user's avatar. */
export function useChangeAvatar() {
  const uploadUrl = useMutation(api.kanban.uploadUrl);
  const urlOf = useMutation(api.kanban.urlOf);
  const update = useMutation(api.users.update);
  return async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    const blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await uploadUrl(), { method: "POST", headers: { "Content-Type": a.mimeType ?? "image/jpeg" }, body: blob });
    const url = await urlOf({ storageId: (await res.json()).storageId });
    if (url) await update({ image: url });
  };
}
