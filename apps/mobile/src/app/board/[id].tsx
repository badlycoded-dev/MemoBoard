import { useRef, useState } from "react";
import { Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Ellipse, Line, Path, Polygon, Rect, Text as SText } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { Tool, SHAPES, defStyle, isArrow, box, ends, hit, Pt } from "@/components/whiteboard/model";
import { colors } from "@/theme/colors";

const INK = "#12275C", BLUE = "#2848E0";
const PAL = [INK, "#E4572E", "#2BA84A", "#8E44AD", "#F2A900", "#1E88E5", "#7A4A21", "#111111", "#FFFFFF", "#FF8FB1", "#7FD6C2", "#C9D6F2"];
const mk = (color: string, width: number) => ({ color, width });
const init: Record<string, any> = { pen: mk(INK, 4), wood: mk("#7A4A21", 6), eraser: mk("", 18), rect: mk(INK, 3), round: mk(INK, 3),
  ellipse: mk(INK, 3), triangle: mk(INK, 3), arrow: mk(INK, 3), arrowThick: mk(INK, 10) };
const TOOLS: [Tool, string][] = [["select", "👆"], ["wood", "✏️"], ["pen", "✒️"], ["eraser", "🧽"], ["rect", "▭"], ["round", "▢"],
  ["ellipse", "◯"], ["triangle", "△"], ["arrow", "→"], ["arrowThick", "⇨"]];
const pathOf = (p: number[]) => { let d = `M${p[0]} ${p[1]}`; for (let i = 2; i < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`; return d; };
const strip = ({ _id, _creationTime, boardId, fileUrl, ...d }: any) => d;
const card = { position: "absolute" as const, backgroundColor: "#fff", borderRadius: 10, padding: 8, elevation: 6, shadowColor: INK, shadowOpacity: 0.25, shadowRadius: 8 };
const sq = { width: 30, height: 30, borderRadius: 6, backgroundColor: "#DFE7FF", alignItems: "center" as const, justifyContent: "center" as const };

const Sw = ({ v, on }: { v: string; on: (c: string) => void }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 6 }}>
    {PAL.map((c) => <Pressable key={c} onPress={() => on(c)} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: 3, borderColor: c === v ? BLUE : "#C5CFE6" }} />)}
  </View>
);
const Step = ({ label, v, set, min, max, step = 1 }: any) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 }}>
    <Text style={{ color: "#1c2b4a", width: 84 }}>{label}</Text>
    <Pressable onPress={() => set(Math.max(min, v - step))} style={sq}><Text style={{ fontSize: 18 }}>−</Text></Pressable>
    <Text style={{ width: 30, textAlign: "center", color: "#1c2b4a" }}>{v}</Text>
    <Pressable onPress={() => set(Math.min(max, v + step))} style={sq}><Text style={{ fontSize: 18 }}>+</Text></Pressable>
  </View>
);

function Shape({ o, m }: any) {
  const s = o.style, b = box(o);
  const tx = (x: number, y: number) => String(o.text ?? "").split("\n").map((l: string, i: number, a: string[]) =>
    <SText key={i} x={x} y={y + (i - (a.length - 1) / 2) * s.fs * 1.2 + s.fs * 0.35} fontSize={s.fs} fontWeight={s.bold ? "700" : "400"} fill={s.tc} textAnchor="middle">{l}</SText>);
  if (isArrow(o.kind)) {
    const { a, b: e } = ends(o, m), ang = Math.atan2(e.y - a.y, e.x - a.x), hl = 8 + s.sw * 2.5;
    const p = (d: number) => `${e.x - hl * Math.cos(ang + d)},${e.y - hl * Math.sin(ang + d)}`;
    return <>
      <Line x1={a.x} y1={a.y} x2={e.x - hl * 0.6 * Math.cos(ang)} y2={e.y - hl * 0.6 * Math.sin(ang)} stroke={s.stroke} strokeWidth={s.sw} strokeLinecap="round" />
      <Polygon points={`${e.x},${e.y} ${p(-0.45)} ${p(0.45)}`} fill={s.stroke} />
      {o.text ? tx((a.x + e.x) / 2, (a.y + e.y) / 2 - s.fs) : null}</>;
  }
  const cp = { stroke: s.stroke, strokeWidth: s.sw, fill: s.fill };
  return <>
    {o.kind === "ellipse" ? <Ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} {...cp} />
      : o.kind === "triangle" ? <Polygon points={`${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h} ${b.x},${b.y + b.h}`} {...cp} />
      : <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={o.kind === "round" ? 18 : 0} {...cp} />}
    {o.text ? tx(b.x + b.w / 2, b.y + b.h / 2) : null}
    {o.code ? <SText x={b.x + b.w - 30} y={b.y - 6} fontSize={13} fill={BLUE}>{"</>"}</SText> : null}
    {o.fileUrl ? <SText x={b.x + b.w - 4} y={b.y - 6} fontSize={13} textAnchor="end">📎</SText> : null}</>;
}

export default function Whiteboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(), ins = useSafeAreaInsets();
  const board = useQuery(api.boards.byPublicId, { publicId: id });
  const args = board ? { boardId: board._id } : "skip";
  const strokesRaw = useQuery(api.strokes.list, args) ?? [];
  const objsRaw = useQuery(api.objects.list, args) ?? [];
  const addS: any = useMutation(api.strokes.add), rmS: any = useMutation(api.strokes.remove);
  const addO: any = useMutation(api.objects.add), rmO: any = useMutation(api.objects.remove), patchO: any = useMutation(api.objects.patch);
  const upUrl = useMutation(api.objects.uploadUrl);
  const [tool, setTool] = useState<Tool>("pen"), [ctl, setCtl] = useState(false), [cfg, setCfg] = useState(init);
  const [sel, setSel] = useState<string | null>(null), [form, setForm] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null), [over, setOver] = useState<Record<string, any>>({}), [pend, setPend] = useState<any[]>([]);
  const [, tick] = useState(0);
  const live = useRef<any>(null), gone = useRef(new Set<string>()), H = useRef<any>({});
  const undoS = useRef<any[]>([]), redoS = useRef<any[]>([]), origin = useRef({ x: 0, y: 0 }), lastTap = useRef({ id: "", t: 0 });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { origin.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }; H.current.down(origin.current); },
    onPanResponderMove: (_, g) => H.current.move({ x: origin.current.x + g.dx, y: origin.current.y + g.dy }),
    onPanResponderRelease: () => H.current.up(), onPanResponderTerminate: () => H.current.up(),
  })).current;

  const strokes: any[] = [...strokesRaw.filter((s: any) => !gone.current.has(s._id)), ...pend.filter((p) => p.isS)];
  const objs: any[] = [...objsRaw.filter((o: any) => !gone.current.has(o._id)).map((o: any) => ({ ...o, ...over[o._id] })), ...pend.filter((p) => !p.isS)];
  const map = new Map(objs.map((o) => [o._id, o]));
  const c = cfg[tool], selO = sel ? map.get(sel) : null, fo = form ? map.get(form.id) : null;
  const top = (p: Pt, noArrow = false) => [...objs].reverse().find((o) => !(noArrow && isArrow(o.kind)) && hit(o, p, map));
  const push = (e: any) => { undoS.current.push(e); redoS.current = []; };

  const create = async (isS: boolean, data: any) => {
    const tmp = { _id: "t" + Math.random(), ...data, isS }; setPend((v) => [...v, tmp]);
    try { const ref = { id: String(await (isS ? addS : addO)({ boardId: board!._id, ...data })) }; push({ ref, op: "add", s: isS, data }); return ref; }
    finally { setPend((v) => v.filter((x) => x !== tmp)); }
  };
  const apply = async (e: any, undoing: boolean) => {
    if (e.op === "upd") return patchO({ id: e.ref.id, patch: undoing ? e.before : e.after });
    if ((e.op === "add") === !undoing) e.ref.id = String(await (e.s ? addS : addO)({ boardId: board!._id, ...e.data }));
    else { gone.current.add(e.ref.id); await (e.s ? rmS : rmO)({ id: e.ref.id }); }
  };
  const doUndo = async () => { const e = undoS.current.pop(); if (e) { await apply(e, true); redoS.current.push(e); tick((n) => n + 1); } };
  const doRedo = async () => { const e = redoS.current.pop(); if (e) { await apply(e, false); undoS.current.push(e); tick((n) => n + 1); } };
  const del = (o: any, isS: boolean) => { gone.current.add(o._id); push({ ref: { id: o._id }, op: "del", s: isS, data: strip(o) }); (isS ? rmS : rmO)({ id: o._id }); if (sel === o._id) setSel(null); };
  const pick = (k: Tool) => { if (k === tool) setCtl((v) => !v); else { setTool(k); setCtl(false); } };
  const openEdit = (o: any) => setForm({ id: o._id, o, text: o.text ?? "", code: o.code ?? "", s: { ...o.style } });
  const save = () => {
    const o = form.o, after = { text: form.text, code: form.code, style: form.s };
    push({ ref: { id: o._id }, op: "upd", before: { text: o.text ?? "", code: o.code ?? "", style: o.style }, after });
    patchO({ id: o._id, patch: after }); setForm(null);
  };
  const attach = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }); if (r.canceled) return;
    const a = r.assets[0], blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await upUrl(), { method: "POST", headers: { "Content-Type": a.mimeType ?? "application/octet-stream" }, body: blob });
    await patchO({ id: form.id, patch: { file: { storageId: (await res.json()).storageId, name: a.name } } });
  };

  const erase = (p: Pt) => {
    const r = cfg.eraser.width;
    for (const s of strokes) { if (s.isS || gone.current.has(s._id)) continue;
      for (let i = 0; i < s.points.length; i += 2) if (Math.hypot(s.points[i] - p.x, s.points[i + 1] - p.y) < r + s.width / 2) { del(s, true); break; } }
  };
  const down = (p: Pt) => {
    if (!board || form) return;
    if (tool === "pen" || tool === "wood") live.current = { k: "draw", pts: [p.x, p.y] };
    else if (tool === "eraser") { live.current = { k: "erase" }; const o = top(p); if (o) del(o, false); erase(p); }
    else if (SHAPES.includes(tool)) live.current = { k: "shape", s: p, from: top(p, true)?._id };
    else {
      const o = top(p), b = selO && !isArrow(selO.kind) ? box(selO) : null;
      if (b && Math.hypot(p.x - b.x - b.w, p.y - b.y - b.h) < 22) live.current = { k: "resize", id: selO._id, o: selO };
      else if (o) { setSel(o._id); live.current = { k: "move", id: o._id, o, s: p }; } else setSel(null);
    }
    if (live.current) setDraft({ ...live.current, p });
  };
  const move = (p: Pt) => {
    const L = live.current; if (!L) return;
    if (L.k === "draw") L.pts.push(Math.round(p.x), Math.round(p.y));
    else if (L.k === "erase") erase(p);
    else if (L.k === "move") setOver((v) => ({ ...v, [L.id]: { x: L.o.x + p.x - L.s.x, y: L.o.y + p.y - L.s.y } }));
    else if (L.k === "resize") setOver((v) => ({ ...v, [L.id]: { w: Math.max(30, p.x - L.o.x), h: Math.max(24, p.y - L.o.y) } }));
    L.p = p; setDraft({ ...L });
  };
  const up = async () => {
    const L = live.current; live.current = null; setDraft(null); if (!L || !board) return;
    if (L.k === "draw") {
      if (L.pts.length === 2) L.pts.push(L.pts[0], L.pts[1]);
      await create(true, { tool, color: c.color, width: c.width, points: L.pts });
    } else if (L.k === "shape") {
      const p = L.p ?? L.s, ar = isArrow(tool); let w = p.x - L.s.x, h = p.y - L.s.y;
      if (ar && Math.hypot(w, h) < 10) return;
      if (!ar && Math.abs(w) < 8 && Math.abs(h) < 8) { w = 120; h = 80; }
      const to = ar ? top(p, true)?._id : undefined;
      const data: any = { kind: tool, x: ar ? L.s.x : Math.min(L.s.x, L.s.x + w), y: ar ? L.s.y : Math.min(L.s.y, L.s.y + h),
        w: ar ? w : Math.abs(w), h: ar ? h : Math.abs(h), style: { ...defStyle, stroke: c.color, sw: c.width, fill: ar ? "none" : "#FFFFFF" },
        ...(ar && L.from ? { fromId: L.from } : {}), ...(to && to !== L.from ? { toId: to } : {}) };
      const ref = await create(false, data); setSel(ref.id); setTool("select"); setCtl(false);
    } else {
      const patch = over[L.id];
      if (!patch) { const now = Date.now(); if (L.k === "move" && lastTap.current.id === L.id && now - lastTap.current.t < 350) openEdit(L.o); lastTap.current = { id: L.id, t: now }; return; }
      push({ ref: { id: L.id }, op: "upd", before: Object.fromEntries(Object.keys(patch).map((k) => [k, L.o[k]])), after: patch });
      await patchO({ id: L.id, patch });
      setOver((v) => { const n = { ...v }; delete n[L.id]; return n; });
    }
  };
  H.current = { down, move, up };

  const ghost = draft?.k === "shape" ? (() => { const p = draft.p, ar = isArrow(tool);
    return { kind: tool, x: ar ? draft.s.x : Math.min(draft.s.x, p.x), y: ar ? draft.s.y : Math.min(draft.s.y, p.y),
      w: ar ? p.x - draft.s.x : Math.abs(p.x - draft.s.x), h: ar ? p.y - draft.s.y : Math.abs(p.y - draft.s.y),
      style: { ...defStyle, stroke: c.color, sw: c.width, fill: "none" } }; })() : null;
  const sb = selO && (() => { if (!isArrow(selO.kind)) return box(selO); const { a, b } = ends(selO, map);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }; })();
  const line = (s: any, k: any) => (
    <Path key={k} d={pathOf(s.points)} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={s.tool === "wood" ? 0.9 : 1} />);
  const grain = (s: any, k: any) => s.tool === "wood" ? <Path key={k + "g"} d={pathOf(s.points)} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={Math.max(1, s.width * 0.45)} strokeDasharray="1 6" fill="none" strokeLinecap="round" /> : null;
  const mono = Platform.OS === "android" ? "monospace" : "Courier";
  const inp = { borderWidth: 1, borderColor: "#C5CFE6", borderRadius: 8, padding: 8, color: "#1c2b4a", marginVertical: 6 };

  return (
    <View style={{ flex: 1 }}>
      <View {...pan.panHandlers} collapsable={false} style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {strokes.map((s, i) => [line(s, s._id ?? i), grain(s, s._id ?? i)])}
          {draft?.k === "draw" && [line({ tool, color: c.color, width: c.width, points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts }, "live"),
            grain({ tool, width: c.width, points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts }, "live")]}
          {objs.map((o) => <Shape key={o._id} o={o} m={map} />)}
          {ghost && <Shape o={ghost} m={map} />}
          {sb && <>
            <Rect x={sb.x - 4} y={sb.y - 4} width={sb.w + 8} height={sb.h + 8} fill="none" stroke={BLUE} strokeDasharray="5 4" />
            {!isArrow(selO.kind) && <Rect x={sb.x + sb.w - 6} y={sb.y + sb.h - 6} width={14} height={14} fill={BLUE} />}</>}
        </Svg>
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", top: ins.top + 8, left: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Pressable onPress={() => router.replace("/")} style={{ backgroundColor: INK, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 }}><Text style={{ color: "#fff", fontWeight: "700" }}>Back</Text></Pressable>
        <Text style={{ color: INK, fontWeight: "800" }}>{board?.name ?? "Loading..."}</Text>
      </View>

      <View style={[card, { left: 8, top: ins.top + 56, maxHeight: "82%" }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {TOOLS.map(([k, g]) => (
            <Pressable key={k} onPress={() => pick(k)} style={{ width: 44, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: tool === k ? "#DFE7FF" : "transparent" }}>
              <Text style={{ fontSize: 22, color: tool === k ? BLUE : "#1c2b4a" }}>{g}</Text></Pressable>))}
          <View style={{ height: 1, backgroundColor: "#DDE3F0", marginVertical: 4 }} />
          <Pressable disabled={!undoS.current.length} onPress={doUndo} style={{ height: 40, alignItems: "center", justifyContent: "center", opacity: undoS.current.length ? 1 : 0.3 }}><Text style={{ fontSize: 22 }}>↶</Text></Pressable>
          <Pressable disabled={!redoS.current.length} onPress={doRedo} style={{ height: 40, alignItems: "center", justifyContent: "center", opacity: redoS.current.length ? 1 : 0.3 }}><Text style={{ fontSize: 22 }}>↷</Text></Pressable>
        </ScrollView>
      </View>

      {ctl && tool !== "select" && (
        <View style={[card, { left: 66, top: ins.top + 56, width: 230, padding: 12 }]}>
          {tool !== "eraser" && <Sw v={c.color} on={(x) => setCfg({ ...cfg, [tool]: { ...c, color: x } })} />}
          <Step label={tool === "eraser" ? "Eraser size" : "Thickness"} v={c.width} min={1} max={tool === "eraser" ? 80 : 30} step={tool === "eraser" ? 4 : 1}
            set={(w: number) => setCfg({ ...cfg, [tool]: { ...c, width: w } })} />
        </View>)}

      {selO && tool === "select" && !form && (
        <View style={[card, { bottom: 16, alignSelf: "center", flexDirection: "row", gap: 16, paddingHorizontal: 20 }]}>
          <Pressable onPress={() => openEdit(selO)}><Text style={{ color: BLUE, fontWeight: "800" }}>Edit</Text></Pressable>
          <Pressable onPress={() => del(selO, false)}><Text style={{ color: "#C0392B", fontWeight: "800" }}>Delete</Text></Pressable>
        </View>)}

      <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" }}>
          {form && <ScrollView style={{ maxHeight: "88%", backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ fontWeight: "800", fontSize: 18, color: INK }}>Edit item</Text>
            <TextInput multiline placeholder="Text" value={form.text} onChangeText={(t) => setForm({ ...form, text: t })} style={inp} />
            <Step label="Text size" v={form.s.fs} min={10} max={48} set={(n: number) => setForm({ ...form, s: { ...form.s, fs: n } })} />
            <Pressable onPress={() => setForm({ ...form, s: { ...form.s, bold: !form.s.bold } })} style={{ marginVertical: 6 }}>
              <Text style={{ color: "#1c2b4a" }}>{form.s.bold ? "☑" : "☐"} Bold text</Text></Pressable>
            <Text style={{ color: "#1c2b4a" }}>Text color</Text><Sw v={form.s.tc} on={(x) => setForm({ ...form, s: { ...form.s, tc: x } })} />
            <Text style={{ color: "#1c2b4a" }}>Outline</Text><Sw v={form.s.stroke} on={(x) => setForm({ ...form, s: { ...form.s, stroke: x } })} />
            {!isArrow(form.o.kind) && <><Text style={{ color: "#1c2b4a" }}>Fill</Text><Sw v={form.s.fill} on={(x) => setForm({ ...form, s: { ...form.s, fill: x } })} /></>}
            <Text style={{ color: "#1c2b4a" }}>Code snippet</Text>
            <TextInput multiline autoCapitalize="none" autoCorrect={false} value={form.code} onChangeText={(t) => setForm({ ...form, code: t })} style={[inp, { fontFamily: mono, minHeight: 90 }]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 6 }}>
              <Pressable onPress={attach} style={{ backgroundColor: "#DFE7FF", padding: 10, borderRadius: 8 }}><Text style={{ color: BLUE, fontWeight: "700" }}>Attach file</Text></Pressable>
              {fo?.file && <Pressable onPress={() => fo.fileUrl && Linking.openURL(fo.fileUrl)}><Text style={{ color: BLUE }}>{fo.file.name}</Text></Pressable>}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 20, marginVertical: 16 }}>
              <Pressable onPress={() => setForm(null)}><Text style={{ color: "#1c2b4a", fontWeight: "700" }}>Cancel</Text></Pressable>
              <Pressable onPress={save}><Text style={{ color: BLUE, fontWeight: "800" }}>Save</Text></Pressable>
            </View>
          </ScrollView>}
        </View>
      </Modal>
    </View>
  );
}
