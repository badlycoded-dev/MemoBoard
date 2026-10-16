import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { api } from "@/services/api";
import { IMPORTANCE, ITEM_COLORS, type TaskTheme } from "@/theme/taskThemes";
import { useLock } from "@/hooks/useLock";
import { MarkdownEditor } from "./MarkdownEditor";
import { Chip } from "./ui";

const when = (t?: number) => (t ? new Date(t).toLocaleString() : "—");
const LOG_ICON: Record<string, any> = { created: "plus-circle-outline", edited: "pencil-outline", moved: "arrow-right-bold-outline", claimed: "hand-back-right-outline", unclaimed: "hand-back-left-off-outline", completed: "check-circle-outline", reopened: "restore", trashed: "trash-can-outline", restored: "delete-restore" };

/** Full task view: main part (title, importance, description, markdown content, look) on the left,
 *  side part (people, dates, actions, activity log) on the right; stacked on narrow screens. */
export function TaskModal({ it, th, cols, mode, by, onClose, onDenied, onClaim, onFinish, onMove, onTrash, onRestore, onPurge }: any) {
  const wide = useWindowDimensions().width >= 760;
  const update = useMutation(api.kanban.itemUpdate);
  const lockItem = useMutation(api.kanban.itemLock), unlockItem = useMutation(api.kanban.itemUnlock);
  useLock(it.status === "trashed" ? null : it._id, lockItem, unlockItem, (who) => onDenied?.(who));
  const uploadUrl = useMutation(api.kanban.uploadUrl);
  const urlOf = useMutation(api.kanban.urlOf);
  const logs = useQuery(api.kanban.logList, { taskId: it._id }) ?? [];
  const [d, setD] = useState({ title: it.title, description: it.description ?? "", content: it.content ?? "", importance: it.importance ?? 1, color: it.color as string | undefined, border: it.border as number | undefined, tint: !!it.tint });
  useEffect(() => setD({ title: it.title, description: it.description ?? "", content: it.content ?? "", importance: it.importance ?? 1, color: it.color, border: it.border, tint: !!it.tint }), [it._id]);
  const dirty = d.title !== it.title || d.description !== (it.description ?? "") || d.content !== (it.content ?? "") || d.importance !== (it.importance ?? 1) || d.color !== it.color || d.border !== it.border || d.tint !== !!it.tint;
  const save = () => d.title.trim() && update({ id: it._id, by, patch: { ...d, color: d.color ?? null, border: d.border ?? null, title: d.title.trim() } });

  const bg = th.dark ? "#0D1117" : "#F6F8FA", panel = th.dark ? "#161B22" : "#FFFFFF", fg = th.dark ? "#E6EDF3" : "#1F2328", muted = th.dark ? "#8D96A0" : "#59636E", line = th.dark ? "#30363D" : "#D1D9E0";
  const imp = IMPORTANCE[d.importance];
  const upload = async (a: any) => {
    const blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await uploadUrl(), { method: "POST", headers: { "Content-Type": a.mimeType ?? "application/octet-stream" }, body: blob });
    return (await urlOf({ storageId: (await res.json()).storageId })) as string;
  };
  const card = { backgroundColor: panel, borderWidth: 1, borderColor: line, borderRadius: 12, padding: 14, gap: 10 } as const;
  const label = (t: string) => <Text style={{ color: muted, fontWeight: "700", fontSize: 12, textTransform: "uppercase" }}>{t}</Text>;
  const row = (k: string, v: string) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ color: muted }}>{k}</Text>
      <Text style={{ color: fg, flexShrink: 1, textAlign: "right" }}>{v}</Text>
    </View>
  );
  const trashed = it.status === "trashed";
  const btn = (text: string, on: () => void, color = th.accent, icon?: any) => (
    <Pressable onPress={on} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: color }}>
      {icon && <MaterialCommunityIcons name={icon} size={17} color={color} />}
      <Text style={{ color, fontWeight: "700" }}>{text}</Text>
    </Pressable>
  );

  const main = (
    <View style={[{ gap: 14 }, wide && { flex: 1 }]}>
      <View style={card}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <View style={{ backgroundColor: d.color ?? imp.color, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}><Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{imp.label.toUpperCase()}</Text></View>
          <View style={{ borderWidth: 1, borderColor: line, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}><Text style={{ color: fg, fontSize: 12 }}>{it.status}</Text></View>
        </View>
        <TextInput value={d.title} onChangeText={(title) => setD({ ...d, title })} placeholder="Task title" placeholderTextColor={muted} style={{ color: fg, fontSize: 24, fontWeight: "800" }} />
        {label("Importance")}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {IMPORTANCE.map((m, i) => <Chip key={m.label} label={m.label} color={m.color} active={d.importance === i} on={() => setD({ ...d, importance: i })} />)}
        </View>
        {label("Description")}
        <TextInput multiline value={d.description} onChangeText={(description) => setD({ ...d, description })} placeholder="Short summary shown to everyone" placeholderTextColor={muted} style={{ color: fg, borderWidth: 1, borderColor: line, borderRadius: 8, padding: 10, minHeight: 64, textAlignVertical: "top" }} />
      </View>
      <View style={card}>
        {label("Content")}
        <MarkdownEditor value={d.content} onChange={(content) => setD({ ...d, content })} upload={upload} dark={th.dark} />
      </View>
      <View style={card}>
        {label("Card look")}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Pressable onPress={() => setD({ ...d, color: undefined })} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 2, borderColor: d.color ? line : fg }}><Text style={{ color: fg, fontSize: 12 }}>Auto</Text></Pressable>
          {ITEM_COLORS.map((c) => <Pressable key={c} onPress={() => setD({ ...d, color: c })} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: 3, borderColor: d.color === c ? fg : "transparent" }} />)}
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Text style={{ color: muted }}>Border</Text>
          {[undefined, 0, 1, 2, 3, 4].map((b) => <Chip key={String(b)} label={b === undefined ? "Theme" : String(b)} color={fg} active={d.border === b} on={() => setD({ ...d, border: b })} />)}
          <Chip label="Tinted" color={fg} active={d.tint} on={() => setD({ ...d, tint: !d.tint })} />
        </View>
      </View>
    </View>
  );

  const side = (
    <View style={[{ gap: 14 }, wide && { width: 270 }]}>
      <View style={card}>
        {label("People & dates")}
        {row("Created by", it.createdBy)}
        {row("Created", when(it.createdAt))}
        {row("Updated", when(it.updatedAt))}
        {row("Claimed by", it.claimedBy ?? "—")}
        {row("Completed", when(it.completedAt))}
        {!trashed && (
          <View style={{ gap: 8, marginTop: 4 }}>
            {btn(it.claimedBy ? "Unclaim" : "Claim task", () => onClaim(it, !it.claimedBy), th.accent, "hand-back-right-outline")}
            {mode === "multi" && btn(it.status === "done" ? "Reopen" : "Finish", () => onFinish(it, it.status !== "done"), "#0E9F6E", "check-circle-outline")}
          </View>
        )}
      </View>
      <View style={card}>
        {label("Column")}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {cols.map((c: any) => <Chip key={c._id} label={c.name} color={th.accent} fg={fg} active={c._id === it.columnId} on={() => onMove(it, c._id)} />)}
        </View>
        {trashed ? (
          <View style={{ gap: 8 }}>
            {btn("Restore", () => { onRestore(it); }, "#0E9F6E", "delete-restore")}
            {btn("Void (delete forever)", () => { onPurge(it); onClose(); }, "#DC2626", "delete-forever-outline")}
          </View>
        ) : btn("Send to trash bin", () => { onTrash(it); onClose(); }, "#DC2626", "trash-can-outline")}
      </View>
      <View style={card}>
        {label("Activity")}
        {logs.length === 0 && <Text style={{ color: muted }}>No activity yet.</Text>}
        {logs.map((l: any) => (
          <View key={l._id} style={{ flexDirection: "row", gap: 8 }}>
            <MaterialCommunityIcons name={LOG_ICON[l.action] ?? "circle-small"} size={16} color={muted} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: fg, fontSize: 13 }}><Text style={{ fontWeight: "700" }}>{l.by}</Text> {l.action}{l.info ? ` · ${l.info}` : ""}</Text>
              <Text style={{ color: muted, fontSize: 11 }}>{when(l.at)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: line, backgroundColor: panel }}>
          <Pressable onPress={onClose} hitSlop={10}><MaterialCommunityIcons name="close" size={26} color={fg} /></Pressable>
          <Text numberOfLines={1} style={{ color: fg, fontWeight: "800", fontSize: 17, flex: 1 }}>{it.title}</Text>
          <Pressable disabled={!dirty} onPress={save} style={{ opacity: dirty ? 1 : 0.4, backgroundColor: th.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}>
            <Text style={{ color: th.dark ? "#0B1020" : "#fff", fontWeight: "800" }}>{dirty ? "Save" : "Saved"}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 14, flexDirection: wide ? "row" : "column", alignItems: wide ? "flex-start" : "stretch", maxWidth: 1200, width: "100%", alignSelf: "center" }}>
          {main}
          {side}
        </ScrollView>
      </View>
    </Modal>
  );
}
