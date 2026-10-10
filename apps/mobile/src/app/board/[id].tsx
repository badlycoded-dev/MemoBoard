import { useRef, useState } from "react";
import { Linking, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { useSettings } from "@/services/settings";
import { BLUE } from "@/theme/theme";
import { BoardThemeProvider, useBoardTheme } from "@/components/whiteboard/BoardTheme";
import { INITIAL_TOOL_CONFIG } from "@/components/whiteboard/constants";
import { Tool, SHAPES, defStyle, isArrow, box, ends, hit, Pt } from "@/components/whiteboard/model";
import { Shape } from "@/components/whiteboard/Shape";
import { BoardHeader } from "@/components/whiteboard/BoardHeader";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { EditSheet } from "@/components/whiteboard/EditSheet";
import { handlesOf, resized } from "@/components/whiteboard/model";
import { isChip, isTextFile, isImg, pathOf, strip, segD } from "@/components/whiteboard/utils";

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
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false),
    [grp, setGrp] = useState<null | "draw" | "obj">(null),
    [sheet, setSheet] = useState<null | "size" | "scale" | "color">(null);
  const dim = useRef({ w: 360, h: 640 });
  const [cam, setCam] = useState({ x: 0, y: 0, k: 1 }),
    pinch = useRef<any>(null);
  const live = useRef<any>(null),
    gone = useRef(new Set<string>()),
    H = useRef<any>({});
  const undoS = useRef<any[]>([]),
    redoS = useRef<any[]>([]),
    origin = useRef({ x: 0, y: 0 }),
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
  const push = (e: any) => {
    undoS.current.push(e);
    redoS.current = [];
  };

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
  const apply = async (e: any, undoing: boolean) => {
    if (e.op === "batch") {
      for (const it of undoing ? [...e.items].reverse() : e.items) await apply(it, undoing);
      return;
    }
    if (e.op === "upd") return patchO({ id: e.ref.id, patch: undoing ? e.before : e.after });
    if ((e.op === "add") === !undoing)
      e.ref.id = String(await (e.s ? addS : addO)({ boardId: board!._id, ...e.data }));
    else {
      gone.current.add(e.ref.id);
      await (e.s ? rmS : rmO)({ id: e.ref.id });
    }
  };
  const doUndo = async () => {
    const e = undoS.current.pop();
    if (e) {
      await apply(e, true);
      redoS.current.push(e);
      tick((n) => n + 1);
    }
  };
  const doRedo = async () => {
    const e = redoS.current.pop();
    if (e) {
      await apply(e, false);
      undoS.current.push(e);
      tick((n) => n + 1);
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
  const openEdit = (o: any) =>
    setForm({
      id: o._id,
      o,
      text: o.text ?? "",
      code: o.code ?? "",
      s: { ...o.style },
      show: !!o.showContent,
    });
  const save = async () => {
    const o = form.o;
    const name: string = fo?.file?.name ?? "";
    let code = form.code;
    if (o.kind === "pin" && form.show && isTextFile(name) && !code && fo?.fileUrl) {
      code = await (await fetch(fo.fileUrl)).text();
    }
    const after: any = { text: form.text, code, style: form.s, showContent: form.show };
    const before: any = {
      text: o.text ?? "",
      code: o.code ?? "",
      style: o.style,
      showContent: !!o.showContent,
    };
    if (o.kind === "pin" && form.show !== !!o.showContent) {
      // switching between file chip and media view resizes the item
      Object.assign(
        after,
        form.show ? { w: Math.max(o.w, 240), h: isImg(name) ? 160 : 200 } : { w: 230, h: 46 },
      );
      Object.assign(before, { w: o.w, h: o.h });
    }
    push({ ref: { id: o._id }, op: "upd", before, after });
    patchO({ id: o._id, patch: after });
    setForm(null);
  };
  const attach = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0],
      blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await upUrl(), {
      method: "POST",
      headers: { "Content-Type": a.mimeType ?? "application/octet-stream" },
      body: blob,
    });
    await patchO({
      id: form.id,
      patch: { file: { storageId: (await res.json()).storageId, name: a.name } },
    });
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
  const mid = () => W({ x: dim.current.w / 2, y: dim.current.h / 2 });
  const place = async (data: any, edit: boolean) => {
    const ref = await create(false, data);
    setSel(ref.id);
    setTool("select");
    setGrp(null);
    setSheet(null);
    if (edit)
      setForm({
        id: ref.id,
        o: { ...data, _id: ref.id },
        text: data.text ?? "",
        code: data.code ?? "",
        s: { ...data.style },
      });
  };
  const addText = () => {
    const m = mid();
    place(
      {
        kind: "text",
        x: m.x - 100,
        y: m.y - 20,
        w: 200,
        h: 40,
        text: "Text",
        style: { ...defStyle, stroke: "none", fill: "none", fs: 22 },
      },
      true,
    );
  };
  const addTip = () => {
    const m = mid();
    place(
      {
        kind: "tip",
        x: m.x + 30,
        y: m.y - 60,
        w: -30,
        h: 60,
        text: "Hint",
        style: { ...defStyle, fs: 14 },
      },
      true,
    );
  };
  const addCode = () => {
    const m = mid();
    place(
      {
        kind: "code",
        x: m.x - 150,
        y: m.y - 100,
        w: 300,
        h: 200,
        text: "snippet.txt",
        code: "",
        style: { ...defStyle, fill: "#F9FAFB", sw: 1, fs: 11 },
      },
      true,
    );
  };
  const addPin = async (mime = "*/*") => {
    const r = await DocumentPicker.getDocumentAsync({ type: mime, copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    const blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await upUrl(), {
      method: "POST",
      headers: { "Content-Type": a.mimeType ?? "application/octet-stream" },
      body: blob,
    });
    const file = { storageId: (await res.json()).storageId, name: a.name };
    const m = mid();
    // New files start as a compact file chip; "Show content" in the editor reveals the media.
    place(
      {
        kind: "pin",
        x: m.x - 115,
        y: m.y - 23,
        w: 230,
        h: 46,
        file,
        showContent: false,
        style: { ...defStyle, fill: "none" },
      },
      false,
    );
  };
  const loadText = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "text/*", copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0],
      t = await (await fetch(a.uri)).text();
    setForm((f: any) => ({ ...f, code: t, text: a.name }));
  };
  const setZoom = (pct: number) => {
    const k = pct / 100,
      cx = dim.current.w / 2,
      cy = dim.current.h / 2,
      wx = (cx - cam.x) / cam.k,
      wy = (cy - cam.y) / cam.k;
    setCam({ k, x: cx - wx * k, y: cy - wy * k });
  };
  const setColor = (x: string) =>
    setCfg(
      Object.fromEntries(
        Object.entries(cfg).map(([k, v]: any) => [
          k,
          k === "eraser" || k === "wood" ? v : { ...v, color: x },
        ]),
      ),
    );
  const W = (p: Pt): Pt => ({ x: (p.x - cam.x) / cam.k, y: (p.y - cam.y) / cam.k });
  const pinchFn = (t: any[]) => {
    const a = t[0],
      b = t[1],
      d = Math.hypot(a.locationX - b.locationX, a.locationY - b.locationY) || 1;
    const m = { x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2 };
    if (!pinch.current) {
      live.current = null;
      setDraft(null);
      setOver({});
      pinch.current = { d, m, cam };
      return;
    }
    const s = pinch.current,
      k = Math.min(5, Math.max(0.2, (s.cam.k * d) / s.d));
    const wx = (s.m.x - s.cam.x) / s.cam.k,
      wy = (s.m.y - s.cam.y) / s.cam.k;
    setCam({ k, x: m.x - wx * k, y: m.y - wy * k });
  };
  const wheel = (e: any) => {
    const r = e.currentTarget?.getBoundingClientRect?.(),
      mx = (e.clientX ?? 0) - (r?.left ?? 0),
      my = (e.clientY ?? 0) - (r?.top ?? 0);
    const k = Math.min(5, Math.max(0.2, cam.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1))),
      wx = (mx - cam.x) / cam.k,
      wy = (my - cam.y) / cam.k;
    setCam({ k, x: mx - wx * k, y: my - wy * k });
  };
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
  /** Taps on the download / edit / delete marks of a file chip. Returns true when handled. */
  const chipTap = (o: any, p: Pt) => {
    if (!isChip(o)) return false;
    const b = box(o);
    const dx = b.x + b.w - p.x;
    if (dx < 0 || dx > 79 || p.y < b.y || p.y > b.y + b.h) return false;
    if (dx < 27) del(o, false);
    else if (dx < 53) openEdit(o);
    else if (o.fileUrl) Linking.openURL(o.fileUrl);
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
        if (L.k === "move" && chipTap(L.o, L.s)) return;
        const now = Date.now();
        if (L.k === "move" && lastTap.current.id === L.id && now - lastTap.current.t < 350)
          openEdit(L.o);
        lastTap.current = { id: L.id, t: now };
        return;
      }
      push({
        ref: { id: L.id },
        op: "upd",
        before: Object.fromEntries(Object.keys(patch).map((k) => [k, L.o[k]])),
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
  const line = (s: any, k: any) => (
    <Path
      key={k}
      d={pathOf(s.points)}
      stroke={T.vis(s.color)}
      strokeWidth={s.width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={s.tool === "wood" ? 0.9 : s.tool === "marker" ? 0.4 : 1}
    />
  );
  const grain = (s: any, k: any) =>
    s.tool === "wood" ? (
      <Path
        key={k + "g"}
        d={pathOf(s.points)}
        stroke="#FFFFFF"
        strokeOpacity={0.4}
        strokeWidth={Math.max(1, s.width * 0.45)}
        strokeDasharray="1 6"
        fill="none"
        strokeLinecap="round"
      />
    ) : null;

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => {
        dim.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      }}
    >
      <View
        {...pan.panHandlers}
        {...({ onWheel: wheel } as any)}
        collapsable={false}
        style={{ flex: 1, backgroundColor: T.canvas }}
      >
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            {strokes.map((s, i) => [line(s, s._id ?? i), grain(s, s._id ?? i)])}
            {draft?.k === "draw" && [
              line(
                {
                  tool,
                  color: c.color,
                  width: c.width,
                  points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts,
                },
                "live",
              ),
              grain(
                {
                  tool,
                  width: c.width,
                  points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts,
                },
                "live",
              ),
            ]}
            {draft?.k === "cut" && (
              <Path
                d={pathOf(draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts)}
                stroke={T.canvas}
                strokeWidth={c.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {objs.map((o) => (
              <Shape key={o._id} o={o} m={map} />
            ))}
            {ghost && <Shape o={ghost} m={map} />}
            {sb && (
              <>
                <Rect
                  x={sb.x - 4}
                  y={sb.y - 4}
                  width={sb.w + 8}
                  height={sb.h + 8}
                  fill="none"
                  stroke={BLUE}
                  strokeDasharray="5 4"
                />
                {selO.kind !== "tip" &&
                  handlesOf(selO, map).map((h) => (
                    <Rect
                      key={h.id}
                      x={h.x - 6 / cam.k}
                      y={h.y - 6 / cam.k}
                      width={12 / cam.k}
                      height={12 / cam.k}
                      rx={6 / cam.k}
                      fill="#fff"
                      stroke={BLUE}
                      strokeWidth={2 / cam.k}
                    />
                  ))}
              </>
            )}
          </G>
        </Svg>
      </View>

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
        canUndo={undoS.current.length > 0}
        canRedo={redoS.current.length > 0}
        top0={ins.top + 60}
        safe={{ left: ins.left, right: ins.right, bottom: ins.bottom }}
        anchor={st.toolbarAnchor}
        horizontal={hz}
        showFull={st.showFullToolbar}
        menu={{ open, setOpen, group: grp, setGroup: setGrp, sheet, setSheet }}
        actions={{
          setTool,
          undo: doUndo,
          redo: doRedo,
          addText,
          addTip,
          addCode,
          addPin,
          setZoom,
          setColor,
          setWidth: (width: number) => setCfg({ ...cfg, [tool]: { ...c, width } }),
        }}
      />

      {selO && tool === "select" && !form && (
        <View
          style={[
            card,
            {
              bottom: hz && st.toolbarAnchor.startsWith("bottom") ? 72 : 16,
              alignSelf: "center",
              flexDirection: "row",
              gap: 16,
              paddingHorizontal: 20,
            },
          ]}
        >
          {selO.kind === "tip" && (
            <Pressable onPress={() => patchO({ id: selO._id, patch: { hidden: !selO.hidden } })}>
              <Text style={{ color: BLUE, fontWeight: "800" }}>
                {selO.hidden ? "Show" : "Hide"}
              </Text>
            </Pressable>
          )}
          {(selO.kind === "pin" || selO.kind === "image") && selO.fileUrl && (
            <Pressable onPress={() => Linking.openURL(selO.fileUrl)}>
              <Text style={{ color: BLUE, fontWeight: "800" }}>Open</Text>
            </Pressable>
          )}
          {selO.kind === "code" && (
            <Pressable onPress={() => Clipboard.setStringAsync(selO.code ?? "")}>
              <Text style={{ color: BLUE, fontWeight: "800" }}>Copy</Text>
            </Pressable>
          )}
          <Pressable onPress={() => openEdit(selO)}>
            <Text style={{ color: BLUE, fontWeight: "800" }}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => del(selO, false)}>
            <Text style={{ color: "#C0392B", fontWeight: "800" }}>Delete</Text>
          </Pressable>
        </View>
      )}

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
