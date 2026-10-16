import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { useSettings } from "@/services/settings";
import { BoardThemeProvider, useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { INITIAL_TOOL_CONFIG } from "@/components/whiteboard/constants";
import { Tool, defStyle, isArrow, box, ends, hit, Pt } from "@/components/whiteboard/model";
import { BoardHeader } from "@/components/whiteboard/BoardHeader";
import { CollabBar, Toast } from "@/components/collab/CollabBar";
import { useGuard } from "@/hooks/useGuard";
import { useLock } from "@/hooks/useLock";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { BoardCanvas, LayerStack, TopOverlay } from "@/components/whiteboard/BoardCanvas";
import { SelectionBar } from "@/components/whiteboard/SelectionBar";
import { useCamera } from "@/hooks/useCamera";
import { useGestures } from "@/hooks/useGestures";
import { useHistory } from "@/hooks/useHistory";
import { useItemActions } from "@/hooks/useItemActions";
import { EditSheet } from "@/components/whiteboard/EditSheet";
import { EmojiPicker } from "@/components/whiteboard/EmojiPicker";
import { LinkPrompt } from "@/components/whiteboard/LinkPrompt";
import { strip } from "@/components/whiteboard/utils";

function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(),
    ins = useSafeAreaInsets(),
    st = useSettings();
  const hz = st.toolbar === "horizontal";
  const T = useBoardTheme();
  const card = T.panel;
  const board = useQuery(api.boards.byPublicId, { publicId: id });
  const args = board ? { boardId: board._id } : "skip";
  // Loaded page by page; the effect keeps pulling pages until the board is complete.
  const strokesQ = usePaginatedQuery(api.strokes.list, args, { initialNumItems: 100 });
  const objsQ = usePaginatedQuery(api.objects.list, args, { initialNumItems: 100 });
  useEffect(() => { if (strokesQ.status === "CanLoadMore") strokesQ.loadMore(200); }, [strokesQ.status, strokesQ.results.length]);
  useEffect(() => { if (objsQ.status === "CanLoadMore") objsQ.loadMore(200); }, [objsQ.status, objsQ.results.length]);
  const strokesRaw: any[] = strokesQ.results;
  const objsRaw: any[] = objsQ.results;
  const rawAddS: any = useMutation(api.strokes.add),
    rawRmS: any = useMutation(api.strokes.remove);
  const rawAddO: any = useMutation(api.objects.add),
    rawRmO: any = useMutation(api.objects.remove),
    rawPatch: any = useMutation(api.objects.patch),
    lockO: any = useMutation(api.objects.lock),
    unlockO: any = useMutation(api.objects.unlock);
  const me: any = useQuery(api.users.me);
  const [note, setNote] = useState<string | null>(null);
  // Viewers get a read-only board: no toolbar, and every write is a no-op instead of a rejected promise.
  const ro = board?.role === "viewer";
  const roRef = useRef(false);
  roRef.current = ro;
  const blocked = () => roRef.current, onErr = () => setNote("You can't edit this board.");
  const addS = useGuard(rawAddS, blocked, onErr), rmS = useGuard(rawRmS, blocked, onErr);
  const addO = useGuard(rawAddO, blocked, onErr), rmO = useGuard(rawRmO, blocked, onErr);
  // Edits are sent one at a time per object with the updatedAt the client last saw, so the server
  // can tell a real conflict (saved as a draft) from our own consecutive edits.
  const objsRef = useRef<any[]>([]);
  objsRef.current = objsRaw;
  const rawRef = useRef(rawPatch);
  rawRef.current = rawPatch;
  const seen = useRef(new Map<string, number>());
  const chain = useRef(new Map<string, Promise<any>>());
  const patchO: any = useRef((a: any) => {
    if (roRef.current) return Promise.resolve(null);
    const next = (chain.current.get(a.id) ?? Promise.resolve()).catch(() => {}).then(async () => {
      const cached = objsRef.current.find((o) => o._id === a.id)?.updatedAt;
      const mine = seen.current.get(a.id);
      const base = mine !== undefined && mine >= (cached ?? 0) ? mine : cached;
      try {
        const r = await rawRef.current({ ...a, base });
        if (r?.status === "ok") seen.current.set(a.id, r.updatedAt);
        else if (r?.status === "locked") setNote(`${r.by} is editing this item`);
        else if (r?.status === "draft") setNote("Someone changed this item first. Your edit was saved as a draft.");
        else if (r?.status === "draft_full") setNote("Draft limit reached (5). Discard a draft first.");
        return r;
      } catch {
        setNote("You can't edit this board.");
        return null;
      }
    });
    chain.current.set(a.id, next);
    return next;
  }).current;
  const upUrl = useMutation(api.objects.uploadUrl);
  const [tool, setTool] = useState<Tool>("select"),
    [ctl, setCtl] = useState(false),
    [cfg, setCfg] = useState(INITIAL_TOOL_CONFIG);
  const [sel, setSelRaw] = useState<string | null>(null),
    [form, setForm] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null),
    [over, setOver] = useState<Record<string, any>>({}),
    [pend, setPend] = useState<any[]>([]);
  const [open, setOpen] = useState(false),
    [grp, setGrp] = useState<any>(null),
    [sheet, setSheet] = useState<null | "size" | "scale" | "color">(null);
  const [linkPrompt, setLinkPrompt] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const dropPoint = useRef<Pt | null>(null);
  const emojiAt = useRef<Pt | null>(null);
  const linkAt = useRef<Pt | null>(null);
  const pinMime = useRef("*/*");
  const dim = useRef({ w: 360, h: 640 });
  const {
    cam,
    setCam,
    pinch,
    setZoom,
    toWorld: W,
    pinchTo: pinchFn,
    wheel,
  } = useCamera(dim, () => {
    live.current = null;
    setDraft(null);
    setOver({});
  });
  const live = useRef<any>(null),
    gone = useRef(new Set<string>()),
    H = useRef<any>({});
  const origin = useRef({ x: 0, y: 0 }),
    lastTap = useRef({ id: "", t: 0 });

  const strokes: any[] = [
    ...strokesRaw.filter((s: any) => !gone.current.has(s._id)),
    ...pend.filter((p) => p.isS),
  ];
  const objs: any[] = [
    ...objsRaw
      .filter((o: any) => !gone.current.has(o._id))
      .map((o: any) => ({ ...o, ...over[o._id] })),
    ...pend.filter((p) => !p.isS),
  ];
  const map = new Map(objs.map((o) => [o._id, o]));
  const c = cfg[tool],
    selO = sel ? map.get(sel) : null,
    fo = form ? map.get(form.id) : null;
  const lockedByOther = (o: any) => !!o?.lockedBy && o.lockedBy !== me?._id && Date.now() - (o.lockedAt ?? 0) < 45000;
  const setSel: any = (v: any) => {
    const o = typeof v === "string" ? map.get(v) : null;
    if (lockedByOther(o)) return setNote(`${o.lockedName ?? "Someone"} is editing this item`);
    setSelRaw(v);
  };
  useLock(!ro && selO && !String(selO._id).startsWith("t0") ? selO._id : null, lockO, unlockO, (by) => { setSelRaw(null); setNote(`${by} is editing this item`); });
  const top = (p: Pt, noArrow = false) =>
    [...objs].reverse().find((o) => !(noArrow && isArrow(o.kind)) && hit(o, p, map));
  const history = useHistory({ addS, rmS, addO, rmO, patchO, boardId: board?._id, gone });
  const { push } = history;

  const create = async (isS: boolean, data: any) => {
    const tmp = { _id: "t" + Math.random(), ...data, isS };
    setPend((v) => [...v, tmp]);
    try {
      const ref = { id: String(await (isS ? addS : addO)({ boardId: board!._id, ...data })) };
      push({ ref, op: "add", s: isS, data });
      return ref;
    } finally {
      setPend((v) => v.filter((x) => x !== tmp));
    }
  };
  const del = (o: any, isS: boolean) => {
    gone.current.add(o._id);
    push({ ref: { id: o._id }, op: "del", s: isS, data: strip(o) });
    (isS ? rmS : rmO)({ id: o._id });
    if (sel === o._id) setSel(null);
  };
  const pick = (k: Tool) => {
    if (k === tool) setCtl((v) => !v);
    else {
      setTool(k);
      setCtl(false);
    }
  };
  const { addEmoji, openEdit, save, attach, addText, addTip, addCode, addLink, addPin, loadText } =
    useItemActions({
      dropPoint,
      linkAt,
      board,
      upUrl,
      patchO,
      form,
      setForm,
      fo,
      push,
      create,
      setSel,
      setTool,
      setGrp,
      setSheet,
      setLinkPrompt,
      dim,
      W,
    });
  const { setColor, change, pan } = useGestures({
    W,
    addCode,
    addPin,
    addS,
    addText,
    addTip,
    board,
    c,
    cam,
    cfg,
    create,
    del,
    dropPoint,
    emojiAt,
    form,
    gone,
    lastTap,
    live,
    map,
    openEdit,
    origin,
    over,
    patchO,
    pinMime,
    pinch,
    pinchFn,
    push,
    rmS,
    selO,
    setCam,
    setCfg,
    setCtl,
    setDraft,
    setEmojiPicker,
    setGrp,
    setOver,
    setPend,
    setSel,
    setSheet,
    setTool,
    strokes,
    tool,
    top,
  });
  const ghost =
    draft?.k === "shape"
      ? (() => {
          const p = draft.p,
            ar = isArrow(tool);
          return {
            kind: tool,
            x: ar ? draft.s.x : Math.min(draft.s.x, p.x),
            y: ar ? draft.s.y : Math.min(draft.s.y, p.y),
            w: ar ? p.x - draft.s.x : Math.abs(p.x - draft.s.x),
            h: ar ? p.y - draft.s.y : Math.abs(p.y - draft.s.y),
            style: { ...defStyle, stroke: c.color, sw: c.width, fill: "none" },
          };
        })()
      : null;
  const sb =
    selO &&
    (() => {
      if (!isArrow(selO.kind)) return box(selO);
      const { a, b } = ends(selO, map);
      return {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(a.x - b.x),
        h: Math.abs(a.y - b.y),
      };
    })();
  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => {
        dim.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      }}
    >
      <BoardCanvas pan={pan} wheel={wheel} />
      <LayerStack strokes={strokes} objs={objs} map={map} cam={cam} />
      <TopOverlay
        tool={tool}
        draft={draft}
        c={c}
        objs={objs}
        map={map}
        ghost={ghost}
        sb={sb}
        selO={selO}
        cam={cam}
      />

      <BoardHeader
        title={board?.name ?? "Loading..."}
        accent={st.accent}
        variant={st.headerStyle}
        topInset={ins.top}
        onBack={() => router.replace("/")}
        onSettings={() => router.push("/settings?from=whiteboards" as any)}
        right={board ? <CollabBar boardId={board._id} publicId={board.publicId} role={board.role} editing={selO?.kind} drafts onNote={setNote} /> : undefined}
      />
      <Toast note={note} onNote={setNote} />

      {!ro && (
      <Toolbar
        tool={tool}
        cfg={cfg}
        zoomPct={Math.round(cam.k * 100)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        top0={ins.top + 60}
        safe={{ left: ins.left, right: ins.right, bottom: ins.bottom }}
        anchor={st.toolbarAnchor}
        horizontal={hz}
        showFull={st.showFullToolbar}
        menu={{ open, setOpen, group: grp, setGroup: setGrp, sheet, setSheet }}
        actions={{
          setTool,
          undo: history.undo,
          redo: history.redo,
          addText,
          addTip,
          addCode,
          addPin,
          openEmoji: () => setEmojiPicker(true),
          pickPin: (mime: string) => {
            pinMime.current = mime;
            setTool("pin");
          },
          setZoom,
          setColor,
          setWidth: (width: number) => setCfg({ ...cfg, [tool]: { ...c, width } }),
        }}
      />
      )}

      {!ro && (
      <SelectionBar
        visible={!!selO && tool === "select" && !form}
        selO={selO}
        card={card}
        hz={hz}
        st={st}
        change={change}
        openEdit={openEdit}
        del={del}
        patchO={patchO}
      />
      )}

      <EmojiPicker
        visible={emojiPicker}
        onClose={() => setEmojiPicker(false)}
        onPick={(emoji) => {
          setEmojiPicker(false);
          dropPoint.current = emojiAt.current;
          addEmoji(emoji);
          dropPoint.current = null;
          emojiAt.current = null;
        }}
      />
      <LinkPrompt
        visible={linkPrompt}
        onClose={() => setLinkPrompt(false)}
        onAdd={(url) => {
          setLinkPrompt(false);
          addLink(url);
        }}
      />
      {!ro && (
      <EditSheet
        form={form}
        setForm={setForm}
        file={fo?.file}
        onSave={save}
        onDelete={() => {
          del(form.o, false);
          setForm(null);
        }}
        onAttach={attach}
        onLoadText={loadText}
      />
      )}
    </View>
  );
}

export default function Whiteboard() {
  const { theme } = useSettings();
  return (
    <BoardThemeProvider mode={theme}>
      <BoardScreen />
    </BoardThemeProvider>
  );
}
