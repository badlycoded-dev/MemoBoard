import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Avatar } from "@/components/account/Avatar";
import { JoinDialog } from "@/components/collab/JoinDialog";
import { ConfirmDialog, Dialog, HoldToDelete } from "@/components/settings/shared";
import { ActionSheet, Opt } from "@/components/tasks/ui";
import { BoardThemeProvider } from "@/components/whiteboard/BoardTheme";
import { api } from "@/services/api";
import { useChangeAvatar } from "@/services/account";
import { platformName } from "@/services/platform";
import { colors } from "@/theme/colors";
import { TASK_THEMES } from "@/theme/taskThemes";

const ACCESS: Record<number, [string, any]> = { 2: ["Private", "lock-outline"], 3: ["Link", "link-variant"], 4: ["Public", "earth"] };
const COLUMN_NAMES: Record<number, string[]> = {
  3: ["Ideas", "Open", "Done"],
  4: ["Ideas", "Open", "In progress", "Done"],
  5: ["Ideas", "Open", "In progress", "Review", "Done"],
};

const Chip = ({ label, on, press, count }: { label: string; on: boolean; press: () => void; count?: number }) => (
  <Pressable onPress={press} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? colors.accent : "transparent", borderWidth: 1.5, borderColor: on ? colors.accent : colors.line }}>
    <Text style={{ color: on ? colors.onAccent : colors.text, fontWeight: "800", fontSize: 13 }}>{label}{count !== undefined ? `  ${count}` : ""}</Text>
  </Pressable>
);
const Tag = ({ icon, text, color = colors.muted }: { icon: any; text: string; color?: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: color, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
    <MaterialCommunityIcons name={icon} size={12} color={color} />
    <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{text}</Text>
  </View>
);

function BoardCard({ b, onOpen, onMenu }: { b: any; onOpen: () => void; onMenu: () => void }) {
  const mine = b.role === "owner";
  const [aLabel, aIcon] = ACCESS[b.access] ?? ["Private", "lock-outline"];
  return (
    <Pressable onPress={onOpen} style={{ backgroundColor: colors.panel, borderLeftWidth: 5, borderLeftColor: mine ? colors.accent : "#7DD3FC", padding: 14, marginBottom: 10, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <MaterialCommunityIcons name={b.type === "task" ? "view-column-outline" : "draw"} size={26} color={colors.text} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{b.name}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {mine ? (
            <Tag icon={aIcon} text={aLabel} color={b.access >= 3 ? "#86EFAC" : colors.muted} />
          ) : (
            <>
              <Tag icon="account-multiple-outline" text={`Shared · ${b.role}`} color="#7DD3FC" />
              <Text style={{ color: colors.muted, fontSize: 12 }}>by {b.ownerName}</Text>
            </>
          )}
          <Text style={{ color: colors.muted, fontSize: 12 }}>{new Date(b.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <Pressable onPress={(e) => { e.stopPropagation?.(); onMenu(); }} hitSlop={10}><MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} /></Pressable>
    </Pressable>
  );
}

function NewTaskDialog({ visible, onClose, onCreate }: { visible: boolean; onClose: () => void; onCreate: (name: string, mode: "progress" | "multi", columns?: string[]) => void }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"progress" | "multi">("progress");
  const [count, setCount] = useState(4);
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Pressable style={{ width: "100%", maxWidth: 420, backgroundColor: colors.panel, borderRadius: 16, padding: 20, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>New task board</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Board name" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10 }} />
          <Text style={{ color: colors.muted }}>Mode</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Chip label="Progress" on={mode === "progress"} press={() => setMode("progress")} />
            <Chip label="Multi-list" on={mode === "multi"} press={() => setMode("multi")} />
          </View>
          <Text style={{ color: colors.muted }}>
            {mode === "progress" ? "To do / Doing / Done. Claiming and finishing move tasks along; everything is logged." : "Free columns you can add, rename, reorder and delete. Create, claim and finish tasks."}
          </Text>
          {mode === "multi" && (
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Text style={{ color: colors.muted }}>Columns</Text>
              {[3, 4, 5].map((n) => <Chip key={n} label={String(n)} on={count === n} press={() => setCount(n)} />)}
            </View>
          )}
          <Pressable onPress={() => { onCreate(name.trim(), mode, mode === "multi" ? COLUMN_NAMES[count] : undefined); setName(""); }} style={{ backgroundColor: colors.accent, padding: 12, borderRadius: 10, alignItems: "center" }}>
            <Text style={{ color: colors.onAccent, fontWeight: "800" }}>Create</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DashboardBody() {
  const router = useRouter();
  const me: any = useQuery(api.users.me);
  const boards: any[] | undefined = useQuery(api.boards.list);
  const pending = (useQuery(api.members.myInvites) ?? []).length;
  const { signOut } = useAuthActions();
  const changeAvatar = useChangeAvatar();
  const create = useMutation(api.boards.create);
  const rename = useMutation(api.boards.rename);
  const remove = useMutation(api.boards.remove);
  const leave = useMutation(api.members.remove);

  const [scope, setScope] = useState<"all" | "mine" | "shared">("all");
  const [type, setType] = useState<"all" | "whiteboard" | "task">("all");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<{ title?: string; options: Opt[] } | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [ren, setRen] = useState<any>(null);
  const [name, setName] = useState("");
  const [del, setDel] = useState<any>(null);
  const [leaving, setLeaving] = useState<any>(null);

  const all = boards ?? [];
  const mineCount = all.filter((b) => b.role === "owner").length;
  const sharedCount = all.length - mineCount;
  const shown = useMemo(
    () =>
      all
        .filter((b) => scope === "all" || (scope === "mine") === (b.role === "owner"))
        .filter((b) => type === "all" || (b.type ?? "whiteboard") === type)
        .filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.createdAt - a.createdAt),
    [boards, scope, type, q],
  );

  const open = (b: any) => router.push((b.type === "task" ? `/task/${b.publicId}` : `/board/${b.publicId}`) as any);
  const go = (publicId: string, kind: string) => router.push((kind === "task" ? `/task/${publicId}` : `/board/${publicId}`) as any);
  const newWhiteboard = async () => go(await create({ name: `Whiteboard ${all.filter((b) => b.type !== "task" && b.role === "owner").length + 1}`, type: "whiteboard" }), "whiteboard");
  const newTaskBoard = async (n: string, mode: "progress" | "multi", columns?: string[]) => {
    setNewTask(false);
    go(await create({ name: n || `Task board ${all.filter((b) => b.type === "task" && b.role === "owner").length + 1}`, type: "task", mode, columns }), "task");
  };
  const boardMenu = (b: any) =>
    setMenu({
      title: b.name,
      options:
        b.role === "owner"
          ? [
              { label: "Open", icon: "open-in-new", on: () => open(b) },
              { label: "Rename", icon: "pencil-outline", on: () => { setName(b.name); setRen(b); } },
              { label: "Share & access", icon: "account-multiple-plus-outline", on: () => router.push(`/share/${b.publicId}` as any) },
              { label: "Delete", icon: "trash-can-outline", danger: true, on: () => setDel(b) },
            ]
          : [
              { label: "Open", icon: "open-in-new", on: () => open(b) },
              { label: "People on this board", icon: "account-multiple-outline", on: () => router.push(`/share/${b.publicId}` as any) },
              { label: "Leave board", icon: "exit-run", danger: true, on: () => setLeaving(b) },
            ],
    });
  const saveName = async () => { if (name.trim()) await rename({ id: ren._id, name: name.trim() }).catch(() => {}); setRen(null); };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 56, maxWidth: 720, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{me?.name ? `Hi, ${me?.name}` : "Welcome"}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Running on {platformName}</Text>
        </View>
        <Pressable onPress={() => setJoinOpen(true)} hitSlop={8}>
          <MaterialCommunityIcons name="account-plus-outline" size={26} color={colors.text} />
          {pending > 0 && <View style={{ position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#F04438", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{pending}</Text></View>}
        </Pressable>
        <Pressable onPress={() => router.push("/settings")} hitSlop={8}><MaterialCommunityIcons name="cog-outline" size={26} color={colors.text} /></Pressable>
        <Pressable onPress={() => setMenu({ title: me?.email, options: [
          { label: "Account settings", icon: "cog-outline", on: () => router.push("/settings/accounts" as any) },
          { label: "Change photo", icon: "camera-outline", on: () => changeAvatar() },
          { label: "Sign out", icon: "logout", danger: true, on: () => signOut() },
        ] })} hitSlop={8}><Avatar uri={me?.image} name={me?.name ?? me?.email} size={38} /></Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <Pressable onPress={newWhiteboard} style={{ flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.accent, padding: 12, borderRadius: 8 }}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.onAccent} /><Text style={{ color: colors.onAccent, fontWeight: "800" }}>Whiteboard</Text>
        </Pressable>
        <Pressable onPress={() => setNewTask(true)} style={{ flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.accent, padding: 12, borderRadius: 8 }}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.onAccent} /><Text style={{ color: colors.onAccent, fontWeight: "800" }}>Task board</Text>
        </Pressable>
      </View>

      <TextInput value={q} onChangeText={setQ} placeholder="Search boards" placeholderTextColor={colors.muted} style={{ color: colors.text, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 12 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
        <Chip label="All" on={scope === "all"} press={() => setScope("all")} count={all.length} />
        <Chip label="Mine" on={scope === "mine"} press={() => setScope("mine")} count={mineCount} />
        <Chip label="Shared with me" on={scope === "shared"} press={() => setScope("shared")} count={sharedCount} />
        <View style={{ width: 1, backgroundColor: colors.line, marginHorizontal: 4 }} />
        <Chip label="Any type" on={type === "all"} press={() => setType("all")} />
        <Chip label="Whiteboards" on={type === "whiteboard"} press={() => setType("whiteboard")} />
        <Chip label="Task boards" on={type === "task"} press={() => setType("task")} />
      </ScrollView>

      {boards === undefined && <Text style={{ color: colors.muted }}>Loading…</Text>}
      {boards && shown.length === 0 && (
        <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 30 }}>
          {all.length === 0 ? "No boards yet. Create one above, or join with an invite." : "No boards match these filters."}
        </Text>
      )}
      {shown.map((b) => <BoardCard key={b._id} b={b} onOpen={() => open(b)} onMenu={() => boardMenu(b)} />)}

      <NewTaskDialog visible={newTask} onClose={() => setNewTask(false)} onCreate={newTaskBoard} />
      <JoinDialog visible={joinOpen} onClose={() => setJoinOpen(false)} />
      <ActionSheet th={TASK_THEMES.paper} title={menu?.title} options={menu?.options ?? null} onClose={() => setMenu(null)} />

      <Dialog visible={!!ren} onClose={() => setRen(null)}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Rename board</Text>
        <TextInput value={name} onChangeText={setName} autoFocus onSubmitEditing={saveName} placeholder="Board title" placeholderTextColor={colors.muted} style={{ color: colors.text, borderColor: colors.line, borderWidth: 1, borderRadius: 10, padding: 10 }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => setRen(null)} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text></Pressable>
          <Pressable onPress={saveName} style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: colors.accent }}><Text style={{ color: colors.onAccent, fontWeight: "800" }}>Save</Text></Pressable>
        </View>
      </Dialog>
      <Dialog visible={!!del} onClose={() => setDel(null)}>
        {del && (
          <>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Delete “{del.name}”?</Text>
            <Text style={{ color: colors.muted }}>The board and everything on it will be permanently deleted for everyone.</Text>
            <HoldToDelete key={del._id} onDone={() => { const id = del._id; setDel(null); remove({ id }).catch(() => {}); }} />
            <Pressable onPress={() => setDel(null)} style={{ padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text></Pressable>
          </>
        )}
      </Dialog>
      <ConfirmDialog visible={!!leaving} title={`Leave “${leaving?.name ?? ""}”?`} body="You will lose access unless you are invited again." confirm="Leave"
        onConfirm={() => me && leave({ boardId: leaving._id, userId: me._id }).catch(() => {})} onClose={() => setLeaving(null)} />
    </ScrollView>
  );
}

export default function Dashboard() {
  // The shared dialogs read the board theme; the dashboard itself uses the app palette.
  return <BoardThemeProvider mode="dark"><DashboardBody /></BoardThemeProvider>;
}
