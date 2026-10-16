import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CollabBar, Toast } from "@/components/collab/CollabBar";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskModal } from "@/components/tasks/TaskModal";
import { ActionSheet, Opt, Prompt } from "@/components/tasks/ui";
import { api } from "@/services/api";
import { useSettings } from "@/services/settings";
import { ITEM_COLORS, TASK_THEMES } from "@/theme/taskThemes";

const COLOR_NAMES = ["Purple", "Blue", "Green", "Amber", "Red", "Pink", "Cyan", "Slate"];

export default function TaskBoard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ins = useSafeAreaInsets();
  const st = useSettings();
  const board: any = useQuery(api.boards.byPublicId, { publicId: id });
  const args = board ? { boardId: board._id } : "skip";
  const cols: any[] = useQuery(api.kanban.colList, args) ?? [];
  const items: any[] = useQuery(api.kanban.itemList, args) ?? [];
  const th = TASK_THEMES[board?.style ?? st.taskTheme] ?? TASK_THEMES.blueprint;
  const by = st.userName.trim() || "me";
  const multi = board?.mode === "multi";
  const showTrash = board?.showTrash ?? st.showTrash;

  const m0: any = {
    add: useMutation(api.kanban.itemAdd), move: useMutation(api.kanban.itemMove), claim: useMutation(api.kanban.itemClaim),
    finish: useMutation(api.kanban.itemFinish), trash: useMutation(api.kanban.itemTrash), restore: useMutation(api.kanban.itemRestore),
    purge: useMutation(api.kanban.itemPurge), colAdd: useMutation(api.kanban.colAdd), colUpdate: useMutation(api.kanban.colUpdate),
    colMove: useMutation(api.kanban.colMove), colRemove: useMutation(api.kanban.colRemove), setStyle: useMutation(api.boards.setStyle),
    rename: useMutation(api.boards.rename), setOptions: useMutation(api.boards.setOptions),
  };
  // Viewers can't write; everyone else gets a notice instead of an uncaught "Not allowed".
  const ro = board?.role === "viewer", isOwner = board?.role === "owner";
  const m: any = Object.fromEntries(Object.entries(m0).map(([k, f]: any) => [k, (...a: any[]) => (ro ? Promise.resolve(null) : Promise.resolve(f(...a)).catch(() => setNote("You can't do that on this board.")))]));

  const [sheet, setSheet] = useState<{ title?: string; options: Opt[] } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<{ title: string; initial?: string; on: (v: string) => void } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const open = items.find((i) => i._id === openId);
  const [note, setNote] = useState<string | null>(null);

  const A = {
    claim: (it: any, claim: boolean) => m.claim({ id: it._id, by, claim }),
    finish: (it: any, done: boolean) => m.finish({ id: it._id, by, done }),
    move: (it: any, columnId: string) => m.move({ id: it._id, columnId: columnId as any, by }),
    trash: (it: any) => m.trash({ id: it._id, by }),
    restore: (it: any) => m.restore({ id: it._id, by }),
    purge: (it: any) => m.purge({ id: it._id }),
  };

  const itemMenu = (it: any) => {
    const trashed = it.status === "trashed";
    const options: Opt[] = trashed
      ? [
          { label: "Restore", icon: "delete-restore", on: () => A.restore(it) },
          { label: "Void (delete forever)", icon: "delete-forever-outline", danger: true, on: () => A.purge(it) },
        ]
      : [
          { label: "Edit task", icon: "pencil-outline", on: () => setOpenId(it._id) },
          { label: it.claimedBy ? "Unclaim task" : "Claim task", icon: "hand-back-right-outline", on: () => A.claim(it, !it.claimedBy) },
          ...(multi ? [{ label: it.status === "done" ? "Reopen" : "Finish", icon: "check-circle-outline" as const, on: () => A.finish(it, it.status !== "done") }] : []),
          {
            label: "Move to…", icon: "arrow-right-bold-outline",
            on: () => setSheet({ title: "Move to", options: cols.filter((c) => c._id !== it.columnId).map((c) => ({ label: c.name, on: () => A.move(it, c._id) })) }),
          },
          { label: "Send to trash bin", icon: "trash-can-outline", danger: true, on: () => A.trash(it) },
        ];
    setSheet({ title: it.title, options });
  };

  const columnMenu = (c: any, i: number) => {
    const options: Opt[] = [
      { label: "Rename", icon: "pencil-outline", on: () => setPrompt({ title: "Rename column", initial: c.name, on: (name) => m.colUpdate({ id: c._id, name }) }) },
      { label: "Color", icon: "palette-outline", on: () => setSheet({ title: "Column color", options: [{ label: "Default", on: () => m.colUpdate({ id: c._id, color: "" }) }, ...ITEM_COLORS.map((hex, n) => ({ label: COLOR_NAMES[n], on: () => m.colUpdate({ id: c._id, color: hex }) }))] }) },
    ];
    if (multi) {
      if (i > 0) options.push({ label: "Move left", icon: "arrow-left", on: () => m.colMove({ id: c._id, dir: -1 }) });
      if (i < cols.length - 1) options.push({ label: "Move right", icon: "arrow-right", on: () => m.colMove({ id: c._id, dir: 1 }) });
      if (cols.length > 2) {
        const to = cols[i === 0 ? 1 : i - 1];
        options.push({ label: `Delete (tasks go to ${to.name})`, icon: "trash-can-outline", danger: true, on: () => m.colRemove({ id: c._id, toId: to._id }) });
      }
    }
    setSheet({ title: c.name, options });
  };

  const submit = (columnId: string) => {
    const title = draft.trim();
    if (!title) return;
    m.add({ boardId: board._id, columnId: columnId as any, title, by });
    setDraft("");
  };

  const colBox = (key: string, name: string, color: string | undefined, list: any[], opts: { menu?: () => void; add?: boolean; trash?: boolean }) => (
    <View key={key} style={{ width: 300, backgroundColor: th.col, borderRadius: th.colRadius, borderWidth: 1, borderColor: th.colBorder, padding: 10, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {opts.trash ? <MaterialCommunityIcons name="trash-can-outline" size={18} color={th.colText} /> : <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color || th.accent }} />}
        <Text numberOfLines={1} style={{ color: th.colText, fontWeight: "800", fontSize: 16, flex: 1 }}>{name}</Text>
        <Text style={{ color: th.colText, opacity: 0.7 }}>{list.length}</Text>
        {opts.menu && <Pressable onPress={opts.menu} hitSlop={8}><MaterialCommunityIcons name="dots-horizontal" size={20} color={th.colText} /></Pressable>}
      </View>
      {list.length === 0 && <Text style={{ color: th.colText, opacity: 0.5, textAlign: "center", paddingVertical: 8 }}>{opts.trash ? "Trash is empty" : "No tasks"}</Text>}
      {list.map((it) => <TaskCard key={it._id} it={it} th={th} onOpen={() => setOpenId(it._id)} onMenu={() => !ro && itemMenu(it)} />)}
      {opts.add &&
        (adding === key ? (
          <TextInput
            autoFocus value={draft} onChangeText={setDraft} onSubmitEditing={() => submit(key)} onBlur={() => { if (!draft.trim()) setAdding(null); }}
            placeholder="Task title, Enter to add" placeholderTextColor={th.muted}
            style={{ backgroundColor: th.card, color: th.cardText, borderRadius: th.radius, padding: 10 }}
          />
        ) : (
          <Pressable onPress={() => { setAdding(key); setDraft(""); }} style={{ padding: 8, borderRadius: th.radius, borderWidth: 1, borderStyle: "dashed", borderColor: th.colText, opacity: 0.8 }}>
            <Text style={{ color: th.colText, textAlign: "center", fontWeight: "700" }}>+ Add task</Text>
          </Pressable>
        ))}
    </View>
  );

  const themeOptions: Opt[] = [
    { label: "Use my default", icon: "backup-restore", on: () => m.setStyle({ id: board._id, style: undefined }) },
    ...Object.entries(TASK_THEMES).map(([k, t]) => ({ label: t.name + (k === (board?.style ?? st.taskTheme) ? "  ✓" : ""), icon: "palette-swatch-outline" as const, on: () => m.setStyle({ id: board._id, style: k }) })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: ins.top + 12, paddingBottom: 8 }}>
        <Pressable onPress={() => router.replace("/")} hitSlop={10}><MaterialCommunityIcons name="arrow-left" size={24} color={th.colText} /></Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => board && isOwner && setPrompt({ title: "Rename board", initial: board.name, on: (name) => m.rename({ id: board._id, name }) })}>
          <Text numberOfLines={1} style={{ color: th.colText, fontSize: 22, fontWeight: "800" }}>{board?.name ?? "Loading…"}</Text>
          <Text style={{ color: th.colText, opacity: 0.65, fontSize: 12 }}>{multi ? "Multi-list board" : "Progress board"}</Text>
        </Pressable>
        {multi && !ro && <Pressable onPress={() => setPrompt({ title: "New column", on: (name) => m.colAdd({ boardId: board._id, name }) })} hitSlop={8}><MaterialCommunityIcons name="table-column-plus-after" size={24} color={th.colText} /></Pressable>}
        {board && <CollabBar boardId={board._id} publicId={board.publicId} role={board.role} editing={open?.title} onNote={setNote} tint="rgba(127,127,127,0.25)" fg={th.colText} />}
        {isOwner && (<Pressable onPress={() => setSheet({ title: "Board style", options: themeOptions })} hitSlop={8}><MaterialCommunityIcons name="palette-outline" size={24} color={th.colText} /></Pressable>)}
        <Pressable onPress={() => setSheet({ title: "Board settings (this board only)", options: [
          ...(!isOwner ? [] : [
            { label: `Trash bin column: ${showTrash ? "on" : "off"}`, icon: "trash-can-outline" as const, on: () => m.setOptions({ id: board._id, showTrash: !showTrash }) },
            { label: "Board style…", icon: "palette-swatch-outline" as const, on: () => setSheet({ title: "Board style", options: themeOptions }) },
          ]),
          { label: "Global settings", icon: "cog-outline", on: () => router.push("/settings?from=tasks" as any) },
        ] })} hitSlop={8}><MaterialCommunityIcons name="cog-outline" size={24} color={th.colText} /></Pressable>
      </View>

      {/* Page scrolls vertically, so a column simply grows as its list grows. */}
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <ScrollView horizontal contentContainerStyle={{ padding: 16, gap: 14, alignItems: "flex-start" }}>
          {cols.map((c, i) =>
            colBox(c._id, c.name, c.color, items.filter((x) => x.columnId === c._id && x.status !== "trashed"), { menu: ro ? undefined : () => columnMenu(c, i), add: !ro }),
          )}
          {showTrash && colBox("trash", "Trash bin", undefined, items.filter((x) => x.status === "trashed"), { trash: true })}
        </ScrollView>
      </ScrollView>

      <Toast note={note} onNote={setNote} />
      {open && (
        <TaskModal
          readOnly={ro} it={open} th={th} cols={cols} mode={board?.mode} by={by} onClose={() => setOpenId(null)} onDenied={(who: string) => { setOpenId(null); setNote(`${who} is editing this task`); }}
          onClaim={A.claim} onFinish={A.finish} onMove={A.move} onTrash={A.trash} onRestore={A.restore} onPurge={A.purge}
        />
      )}
      <ActionSheet th={th} title={sheet?.title} options={sheet?.options ?? null} onClose={() => setSheet(null)} />
      <Prompt th={th} visible={!!prompt} title={prompt?.title ?? ""} initial={prompt?.initial} onSubmit={(v) => prompt?.on(v)} onClose={() => setPrompt(null)} />
    </View>
  );
}
