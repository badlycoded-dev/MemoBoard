import { useRef, useState } from "react";
import { Linking, PanResponder, View } from "react-native";
import Svg from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { useSettings } from "@/services/settings";
import { BoardThemeProvider, useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { INITIAL_TOOL_CONFIG } from "@/components/whiteboard/constants";
import { Tool, SHAPES, defStyle, isArrow, box, ends, hit, Pt } from "@/components/whiteboard/model";
import { BoardHeader } from "@/components/whiteboard/BoardHeader";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { BoardCanvas } from "@/components/whiteboard/BoardCanvas";
import { SelectionBar } from "@/components/whiteboard/SelectionBar";
import { useCamera } from "@/hooks/useCamera";
import { useHistory } from "@/hooks/useHistory";
import { useItemActions } from "@/hooks/useItemActions";
import { EditSheet } from "@/components/whiteboard/EditSheet";
import { LinkPrompt } from "@/components/whiteboard/LinkPrompt";
import { MediaLayer } from "@/components/whiteboard/MediaLayer";
import { handlesOf, resized } from "@/components/whiteboard/model";
import { actionAt, strip, segD } from "@/components/whiteboard/utils";

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
  const strokesRaw = useQuery(api.strokes.list, args) ?? [];
  const objsRaw = useQuery(api.objects.list, args) ?? [];
  const addS: any = useMutation(api.strokes.add),
    rmS: any = useMutation(api.strokes.remove);
  const addO: any = useMutation(api.objects.add),
    rmO: any = useMutation(api.objects.remove),
    patchO: any = useMutation(api.objects.patch);
  const upUrl = useMutation(api.objects.uploadUrl);
  const [tool, setTool] = useState<Tool>("select"),
    [ctl, setCtl] = useState(false),
    [cfg, setCfg] = useState(INITIAL_TOOL_CONFIG);
  const [sel, setSel] = useState<string | null>(null),
    [form, setForm] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null),
    [over, setOver] = useState<Record<string, any>>({}),
    [pend, setPend] = useState<any[]>([]);
  const [open, setOpen] = useState(false),
    [grp, setGrp] = useState<null | "draw" | "obj">(null),
    [sheet, setSheet] = useState<null | "size" | "scale" | "color">(null);
  const [linkPrompt, setLinkPrompt] = useState(false);
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

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const t = e.nativeEvent.touches;
        origin.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        if (t.length < 2) H.current.down(origin.current);
        else H.current.pinch(t);
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t.length >= 2) H.current.pinch(t);
        else H.current.move({ x: origin.current.x + g.dx, y: origin.current.y + g.dy });
      },
      onPanResponderRelease: () => H.current.up(),
      onPanResponderTerminate: () => H.current.up(),
    }),
  ).current;

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
  const erase = (p: Pt) => {
    const r = cfg.eraser.width;
    for (const s of strokes) {
      if (s.isS || gone.current.has(s._id)) continue;
      for (let i = 0; i < s.points.length; i += 2)
        if (Math.hypot(s.points[i] - p.x, s.points[i + 1] - p.y) < r + s.width / 2) {
          del(s, true);
          break;
        }
    }
  };
  const cut = async (path: number[], r: number) => {
    const E: Pt[] = [];
    for (let i = 0; i < path.length; i += 2) E.push({ x: path[i], y: path[i + 1] });
    const near = (x: number, y: number) => E.some((e, i) => segD({ x, y }, e, E[i + 1] ?? e) < r);
    const items: any[] = [],
      pieces: any[] = [];
    for (const s of strokes) {
      if (s.isS || gone.current.has(s._id)) continue;
      const runs: number[][] = [[]];
      let hitAny = false;
      for (let i = 0; i < s.points.length; i += 2) {
        if (near(s.points[i], s.points[i + 1])) {
          hitAny = true;
          runs.push([]);
        } else runs[runs.length - 1].push(s.points[i], s.points[i + 1]);
      }
      if (!hitAny) continue;
      gone.current.add(s._id);
      rmS({ id: s._id });
      items.push({ ref: { id: s._id }, op: "del", s: true, data: strip(s) });
      runs.forEach((run) => run.length >= 4 && pieces.push({ ...strip(s), points: run }));
    }
    if (!items.length) return;
    const tmps = pieces.map((d) => ({ _id: "t" + Math.random(), ...d, isS: true }));
    setPend((v) => [...v, ...tmps]);
    try {
      for (const d of pieces)
        items.push({
          ref: { id: String(await addS({ boardId: board!._id, ...d })) },
          op: "add",
          s: true,
          data: d,
        });
    } finally {
      setPend((v) => v.filter((x) => !tmps.includes(x)));
    }
    push({ op: "batch", items });
  };
  const pipette = (p: Pt) => {
    let best: string | null = null,
      bd = 12;
    for (const s of strokes) {
      if (s.isS) continue;
      for (let i = 0; i < s.points.length - 2; i += 2) {
        const d = segD(
          p,
          { x: s.points[i], y: s.points[i + 1] },
          { x: s.points[i + 2], y: s.points[i + 3] },
        );
        if (d < bd) {
          bd = d;
          best = s.color;
        }
      }
    }
    const o = top(p);
    if (o && !best) best = o.style.fill && o.style.fill !== "none" ? o.style.fill : o.style.stroke;
    if (best) {
      setColor(best);
      setTool("pen");
    }
  };
  const { openEdit, save, attach, addText, addTip, addCode, addLink, addPin, loadText } =
    useItemActions({
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
  const setColor = (x: string) =>
    setCfg(
      Object.fromEntries(
        Object.entries(cfg).map(([k, v]: any) => [
          k,
          k === "eraser" || k === "wood" ? v : { ...v, color: x },
        ]),
      ),
    );
  const down = (sp: Pt) => {
    const p = W(sp);
    if (!board || form) return;
    if (["pen", "marker", "wood"].includes(tool)) live.current = { k: "draw", pts: [p.x, p.y] };
    else if (tool === "pipette") pipette(p);
    else if (tool === "eraser2") live.current = { k: "cut", pts: [p.x, p.y] };
    else if (tool === "eraser") {
      live.current = { k: "erase" };
      const o = top(p);
      if (o) del(o, false);
      erase(p);
    } else if (SHAPES.includes(tool)) live.current = { k: "shape", s: p, from: top(p, true)?._id };
    else {
      const o = top(p),
        handle =
          selO && selO.kind !== "tip"
            ? handlesOf(selO, map).find((h) => Math.hypot(p.x - h.x, p.y - h.y) < 22 / cam.k)
            : null;
      if (handle) live.current = { k: "resize", id: selO._id, o: selO, handle: handle.id };
      else if (o) {
        setSel(o._id);
        live.current = { k: "move", id: o._id, o, s: p };
      } else {
        setSel(null);
        live.current = { k: "pan", s: sp, c: cam };
      }
    }
    if (live.current) setDraft({ ...live.current, p });
  };
  const move = (sp: Pt) => {
    const L = live.current;
    if (!L || pinch.current) return;
    const p = W(sp);
    if (L.k === "draw") L.pts.push(Math.round(p.x), Math.round(p.y));
    else if (L.k === "erase") erase(p);
    else if (L.k === "cut") L.pts.push(Math.round(p.x), Math.round(p.y));
    else if (L.k === "pan") setCam({ ...L.c, x: L.c.x + sp.x - L.s.x, y: L.c.y + sp.y - L.s.y });
    else if (L.k === "move")
      setOver((v) => ({ ...v, [L.id]: { x: L.o.x + p.x - L.s.x, y: L.o.y + p.y - L.s.y } }));
    else if (L.k === "resize") setOver((v) => ({ ...v, [L.id]: resized(L.o, L.handle, p) }));
    L.p = p;
    setDraft({ ...L });
  };
  /** Records a change of item fields so it can be undone. */
  const change = (o: any, patch: any) => {
    const before = Object.fromEntries(
      Object.keys(patch).map((k) => [k, o[k] ?? (typeof patch[k] === "boolean" ? false : 0)]),
    );
    push({ ref: { id: o._id }, op: "upd", before, after: patch });
    patchO({ id: o._id, patch });
  };
  const runAction = (o: any, act: string) => {
    if (act === "delete") del(o, false);
    else if (act === "edit") openEdit(o);
    else if (act === "download") Linking.openURL(o.fileUrl);
    else if (act === "open") Linking.openURL(o.url);
    else Clipboard.setStringAsync(o.code ?? "");
  };
  /** Taps on the copy / download / edit / delete buttons of chips and viewers. */
  const actionTap = (o: any, p: Pt) => {
    const act = actionAt(o, p);
    if (!act) return false;
    runAction(o, act);
    return true;
  };
  const up = async () => {
    if (pinch.current) {
      pinch.current = null;
      return;
    }
    const L = live.current;
    live.current = null;
    setDraft(null);
    if (!L || !board || L.k === "pan") return;
    if (L.k === "draw") {
      if (L.pts.length === 2) L.pts.push(L.pts[0], L.pts[1]);
      await create(true, { tool, color: c.color, width: c.width, points: L.pts });
    } else if (L.k === "cut") {
      await cut(L.pts.length === 2 ? [...L.pts, ...L.pts] : L.pts, c.width / 2);
    } else if (L.k === "shape") {
      const p = L.p ?? L.s,
        ar = isArrow(tool);
      let w = p.x - L.s.x,
        h = p.y - L.s.y;
      if (ar && Math.hypot(w, h) < 10) return;
      if (!ar && Math.abs(w) < 8 && Math.abs(h) < 8) {
        w = 120;
        h = 80;
      }
      const to = ar ? top(p, true)?._id : undefined;
      const data: any = {
        kind: tool,
        x: ar ? L.s.x : Math.min(L.s.x, L.s.x + w),
        y: ar ? L.s.y : Math.min(L.s.y, L.s.y + h),
        w: ar ? w : Math.abs(w),
        h: ar ? h : Math.abs(h),
        style: { ...defStyle, stroke: c.color, sw: c.width, fill: ar ? "none" : "#FFFFFF" },
        ...(ar && L.from ? { fromId: L.from } : {}),
        ...(to && to !== L.from ? { toId: to } : {}),
      };
      const ref = await create(false, data);
      setSel(ref.id);
      setTool("select");
      setCtl(false);
      setGrp(null);
      setSheet(null);
    } else {
      const patch = over[L.id];
      if (!patch) {
        if (L.k === "move" && actionTap(L.o, L.s)) return;
        const now = Date.now();
        if (L.k === "move" && lastTap.current.id === L.id && now - lastTap.current.t < 350)
          openEdit(L.o);
        lastTap.current = { id: L.id, t: now };
        return;
      }
      push({
        ref: { id: L.id },
        op: "upd",
        before: Object.fromEntries(Object.keys(patch).map((k) => [k, L.o[k] ?? 0])),
        after: patch,
      });
      await patchO({ id: L.id, patch });
      setOver((v) => {
        const n = { ...v };
        delete n[L.id];
        return n;
      });
    }
  };
  H.current = { down, move, up, pinch: pinchFn };

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
      <BoardCanvas
        strokes={strokes}
        draft={draft}
        tool={tool}
        c={c}
        objs={objs}
        map={map}
        ghost={ghost}
        sb={sb}
        selO={selO}
        cam={cam}
        pan={pan}
        wheel={wheel}
      />

      <MediaLayer objs={objs} cam={cam} />

      <BoardHeader
        title={board?.name ?? "Loading..."}
        accent={st.accent}
        variant={st.headerStyle}
        topInset={ins.top}
        onBack={() => router.replace("/")}
        onSettings={() => router.push("/settings")}
      />

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
          setZoom,
          setColor,
          setWidth: (width: number) => setCfg({ ...cfg, [tool]: { ...c, width } }),
        }}
      />

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

      <LinkPrompt
        visible={linkPrompt}
        onClose={() => setLinkPrompt(false)}
        onAdd={(url) => {
          setLinkPrompt(false);
          addLink(url);
        }}
      />
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
