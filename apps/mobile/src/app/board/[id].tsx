import { useEffect, useRef, useState } from "react";
import { Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Image as SvgImage, Ellipse, G, Line, Path, Polygon, Rect, Text as SText } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { Slider } from "@/components/ui/Slider";
import { getSettings, ready, useSettings } from "@/services/settings";
import { themes } from "@/theme/theme";
import { ColorPicker } from "@/components/ColorPicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { Tool, SHAPES, defStyle, isArrow, box, ends, hit, Pt } from "@/components/whiteboard/model";
import { colors } from "@/theme/colors";

const INK = "#12275C", BLUE = "#2848E0";
const PAL = [INK, "#E4572E", "#2BA84A", "#8E44AD", "#F2A900", "#1E88E5", "#7A4A21", "#111111", "#FFFFFF", "#FF8FB1", "#7FD6C2", "#C9D6F2"];
const mk = (color: string, width: number) => ({ color, width });
const init: Record<string, any> = {
  pen: mk(INK, 4), marker: mk("#F2A900", 14), wood: mk("#111111", 6), eraser: mk("", 18), eraser2: mk("", 18), pipette: mk("", 1), rect: mk(INK, 3), round: mk(INK, 3),
  ellipse: mk(INK, 3), triangle: mk(INK, 3), arrow: mk(INK, 3), arrowThick: mk(INK, 10)
};
const TOOLS: [Tool, string][] = [["select", "➤"], ["pen", "✎"], ["wood", "✏"], ["eraser", "⌫"], ["rect", "▭"], ["round", "▢"],
["ellipse", "◯"], ["triangle", "△"], ["arrow", "→"], ["arrowThick", "⇨"]];
const DRAW: [Tool, string, string][] = [["pen", "✎", "Pen"], ["marker", "▬", "Marker"], ["wood", "✏", "Wooden pen"], ["eraser", "⌫", "Eraser (lines)"], ["eraser2", "◐", "Eraser (parts)"], ["pipette", "💧", "Pipette"]];
const OBJ: [Tool, string, string][] = [["rect", "▭", "Rectangle"], ["round", "▢", "Rounded rectangle"], ["ellipse", "◯", "Circle"],
["triangle", "△", "Triangle"], ["arrow", "→", "Thin arrow"], ["arrowThick", "⇨", "Thick arrow"]];
const isDraw = (t: Tool) => DRAW.some((d) => d[0] === t), isObj = (t: Tool) => OBJ.some((d) => d[0] === t);
const Btn = ({ g, on, sel }: any) => (
  <Pressable onPress={on} style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: sel ? T.sel : "transparent", alignItems: "center", justifyContent: "center" }}>
    <Text style={{ fontSize: 20, color: T.text }}>{g}</Text></Pressable>);
const ext = (n: string) => (n.split(".").pop() || "").toLowerCase();
const isImg = (n: string) => /^(png|jpe?g|gif|webp|bmp)$/.test(ext(n));
const fileIcon = (n: string) => {
  const e = ext(n);
  return /^(txt|md|log|json|csv|pdf|docx?)$/.test(e) ? "📄" : /^(mp3|wav|ogg|flac|m4a)$/.test(e) ? "🔊" : /^(mp4|mov|mkv|avi|webm)$/.test(e) ? "📼" : /^(zip|rar|7z|tar|gz)$/.test(e) ? "🗃️" : "📦";
};
const pathOf = (p: number[]) => { let d = `M${p[0]} ${p[1]}`; for (let i = 2; i < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`; return d; };
const strip = ({ _id, _creationTime, boardId, fileUrl, userId, createdAt, ...d }: any) => d;
const segD = (p: Pt, a: Pt, b: Pt) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
const cardBase = { position: "absolute" as const, backgroundColor: "#fff", borderRadius: 14, padding: 6, borderWidth: 1, borderColor: "#EAECF0", elevation: 4, shadowColor: "#101828", shadowOpacity: 0.1, shadowRadius: 8 };
let card: any = cardBase, T = themes.light, DARK = false;
const vis = (c: string) => (DARK && c?.toLowerCase() === INK.toLowerCase() ? "#F8FAFC" : c);
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
  const s = { ...o.style, stroke: vis(o.style.stroke), tc: vis(o.style.tc) }, b = box(o);
  if (o.kind === "tip") {
    const an = { x: o.x + o.w, y: o.y + o.h };
    if (o.hidden) return <><Ellipse cx={an.x} cy={an.y} rx={15} ry={15} fill="#FEF0C7" stroke="#F79009" strokeWidth={2} /><SText x={an.x} y={an.y + 6} fontSize={16} textAnchor="middle">💡</SText></>;
    return <>
      <Line x1={an.x} y1={an.y} x2={o.x + 90} y2={o.y + 19} stroke="#98A2B3" strokeWidth={1.5} />
      <Ellipse cx={an.x} cy={an.y} rx={5} ry={5} fill="#F79009" />
      <Rect x={o.x} y={o.y} width={180} height={38} rx={10} fill="#F2F4F7" stroke="#D0D5DD" />
      <SText x={o.x + 90} y={o.y + 24} fontSize={s.fs} fill={s.tc} fontWeight={s.bold ? "700" : "400"} textAnchor="middle">{String(o.text ?? "").slice(0, 24)}</SText></>;
  }
  if (o.kind === "pin") {
    const n = o.file?.name ?? "file", my = b.y + b.h / 2;
    return <>
      <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill="#fff" stroke="#D0D5DD" />
      <SText x={b.x + 12} y={my + 7} fontSize={20}>{fileIcon(n)}</SText>
      <SText x={b.x + 42} y={my + 5} fontSize={13} fill={T.text}>{n.length > 18 ? n.slice(0, 17) + "…" : n}</SText>
      <SText x={b.x + b.w - 12} y={my + 6} fontSize={16} textAnchor="end" fill={BLUE}>⬇</SText></>;
  }
  if (o.kind === "image") return <>
    <SText x={b.x} y={b.y - 6} fontSize={11} fill="#667085">{o.file?.name}</SText>
    {o.fileUrl ? <SvgImage x={b.x} y={b.y} width={b.w} height={b.h} href={{ uri: o.fileUrl }} preserveAspectRatio="xMidYMid slice" /> : <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#F2F4F7" />}
    <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#D0D5DD" /></>;
  if (o.kind === "code") {
    const lines = String(o.code ?? "").split("\n"), n = Math.max(1, Math.floor((b.h - 30) / 14)), mc = Math.max(4, Math.floor((b.w - 40) / 6.6));
    return <>
      <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill="#F9FAFB" stroke="#98A2B3" />
      <Rect x={b.x} y={b.y} width={b.w} height={24} rx={8} fill="#E4E7EC" />
      <SText x={b.x + 10} y={b.y + 16} fontSize={11} fill={T.text}>{o.text ?? "snippet"}</SText>
      {lines.slice(0, n).map((l: string, i: number) => <SText key={i} x={b.x + 8} y={b.y + 40 + i * 14} fontSize={11} fontFamily="monospace" fill="#1D2939">{`${i + 1}  ${l.slice(0, mc)}`}</SText>)}</>;
  }
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
  const router = useRouter(), ins = useSafeAreaInsets(), st = useSettings();
  const hz = st.toolbar === "horizontal";
  T = themes[st.theme]; DARK = st.theme === "dark"; card = { ...cardBase, backgroundColor: T.card, borderColor: T.border };
  const board = useQuery(api.boards.byPublicId, { publicId: id });
  const args = board ? { boardId: board._id } : "skip";
  const strokesRaw = useQuery(api.strokes.list, args) ?? [];
  const objsRaw = useQuery(api.objects.list, args) ?? [];
  const addS: any = useMutation(api.strokes.add), rmS: any = useMutation(api.strokes.remove);
  const addO: any = useMutation(api.objects.add), rmO: any = useMutation(api.objects.remove), patchO: any = useMutation(api.objects.patch);
  const upUrl = useMutation(api.objects.uploadUrl);
  const [tool, setTool] = useState<Tool>("select"), [ctl, setCtl] = useState(false), [cfg, setCfg] = useState(init);
  const [sel, setSel] = useState<string | null>(null), [form, setForm] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null), [over, setOver] = useState<Record<string, any>>({}), [pend, setPend] = useState<any[]>([]);
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false), [grp, setGrp] = useState<null | "draw" | "obj">(null), [sheet, setSheet] = useState<null | "size" | "scale" | "color">(null);
  const dim = useRef({ w: 360, h: 640 });
  const mainRef = useRef<ScrollView>(null), subRef = useRef<ScrollView>(null);
  useEffect(() => { ready.then(() => setOpen(getSettings().startExpanded)); }, []);
  useEffect(() => { // keep the selected tool visible in scrolling toolbars
    const mi = tool === "select" ? 1 : isDraw(tool) ? 2 : 3, si = DRAW.findIndex((d) => d[0] === tool);
    const to = (i: number) => ({ [hz ? "x" : "y"]: Math.max(0, i * 42 - 84), animated: true } as any);
    mainRef.current?.scrollTo(to(mi)); subRef.current?.scrollTo(to(si < 0 ? 0 : si));
  }, [tool, open, grp, hz]);
  const [cam, setCam] = useState({ x: 0, y: 0, k: 1 }), pinch = useRef<any>(null);
  const live = useRef<any>(null), gone = useRef(new Set<string>()), H = useRef<any>({});
  const undoS = useRef<any[]>([]), redoS = useRef<any[]>([]), origin = useRef({ x: 0, y: 0 }), lastTap = useRef({ id: "", t: 0 });

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { const t = e.nativeEvent.touches; origin.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }; if (t.length < 2) H.current.down(origin.current); else H.current.pinch(t); },
    onPanResponderMove: (e, g) => { const t = e.nativeEvent.touches; if (t.length >= 2) H.current.pinch(t); else H.current.move({ x: origin.current.x + g.dx, y: origin.current.y + g.dy }); },
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
    if (e.op === "batch") { for (const it of undoing ? [...e.items].reverse() : e.items) await apply(it, undoing); return; }
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
    for (const s of strokes) {
      if (s.isS || gone.current.has(s._id)) continue;
      for (let i = 0; i < s.points.length; i += 2) if (Math.hypot(s.points[i] - p.x, s.points[i + 1] - p.y) < r + s.width / 2) { del(s, true); break; }
    }
  };
  const cut = async (path: number[], r: number) => {
    const E: Pt[] = []; for (let i = 0; i < path.length; i += 2) E.push({ x: path[i], y: path[i + 1] });
    const near = (x: number, y: number) => E.some((e, i) => segD({ x, y }, e, E[i + 1] ?? e) < r);
    const items: any[] = [], pieces: any[] = [];
    for (const s of strokes) {
      if (s.isS || gone.current.has(s._id)) continue;
      const runs: number[][] = [[]]; let hitAny = false;
      for (let i = 0; i < s.points.length; i += 2) { if (near(s.points[i], s.points[i + 1])) { hitAny = true; runs.push([]); } else runs[runs.length - 1].push(s.points[i], s.points[i + 1]); }
      if (!hitAny) continue;
      gone.current.add(s._id); rmS({ id: s._id });
      items.push({ ref: { id: s._id }, op: "del", s: true, data: strip(s) });
      runs.forEach((run) => run.length >= 4 && pieces.push({ ...strip(s), points: run }));
    }
    if (!items.length) return;
    const tmps = pieces.map((d) => ({ _id: "t" + Math.random(), ...d, isS: true })); setPend((v) => [...v, ...tmps]);
    try { for (const d of pieces) items.push({ ref: { id: String(await addS({ boardId: board!._id, ...d })) }, op: "add", s: true, data: d }); }
    finally { setPend((v) => v.filter((x) => !tmps.includes(x))); }
    push({ op: "batch", items });
  };
  const pipette = (p: Pt) => {
    let best: string | null = null, bd = 12;
    for (const s of strokes) { if (s.isS) continue; for (let i = 0; i < s.points.length - 2; i += 2) { const d = segD(p, { x: s.points[i], y: s.points[i + 1] }, { x: s.points[i + 2], y: s.points[i + 3] }); if (d < bd) { bd = d; best = s.color; } } }
    const o = top(p); if (o && !best) best = o.style.fill && o.style.fill !== "none" ? o.style.fill : o.style.stroke;
    if (best) { setColor(best); setTool("pen"); }
  };
  const mid = () => W({ x: dim.current.w / 2, y: dim.current.h / 2 });
  const place = async (data: any, edit: boolean) => {
    const ref = await create(false, data); setSel(ref.id); setTool("select"); setGrp(null); setSheet(null);
    if (edit) setForm({ id: ref.id, o: { ...data, _id: ref.id }, text: data.text ?? "", code: data.code ?? "", s: { ...data.style } });
  };
  const addText = () => { const m = mid(); place({ kind: "text", x: m.x - 100, y: m.y - 20, w: 200, h: 40, text: "Text", style: { ...defStyle, stroke: "none", fill: "none", fs: 22 } }, true); };
  const addTip = () => { const m = mid(); place({ kind: "tip", x: m.x + 30, y: m.y - 60, w: -30, h: 60, text: "Hint", style: { ...defStyle, fs: 14 } }, true); };
  const addCode = () => { const m = mid(); place({ kind: "code", x: m.x - 150, y: m.y - 100, w: 300, h: 200, text: "snippet.txt", code: "", style: { ...defStyle, fill: "#F9FAFB", sw: 1, fs: 11 } }, true); };
  const addPin = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true }); if (r.canceled) return;
    const a = r.assets[0], blob = await (await fetch(a.uri)).blob();
    const res = await fetch(await upUrl(), { method: "POST", headers: { "Content-Type": a.mimeType ?? "application/octet-stream" }, body: blob });
    const file = { storageId: (await res.json()).storageId, name: a.name }, m = mid(), img = isImg(a.name);
    place({ kind: img ? "image" : "pin", x: m.x - (img ? 120 : 95), y: m.y - (img ? 80 : 20), w: img ? 240 : 190, h: img ? 160 : 40, file, style: { ...defStyle, fill: "none" } }, false);
  };
  const loadText = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "text/*", copyToCacheDirectory: true }); if (r.canceled) return;
    const a = r.assets[0], t = await (await fetch(a.uri)).text(); setForm((f: any) => ({ ...f, code: t, text: a.name }));
  };
  const setZoom = (pct: number) => {
    const k = pct / 100, cx = dim.current.w / 2, cy = dim.current.h / 2, wx = (cx - cam.x) / cam.k, wy = (cy - cam.y) / cam.k;
    setCam({ k, x: cx - wx * k, y: cy - wy * k });
  };
  const setColor = (x: string) => setCfg(Object.fromEntries(Object.entries(cfg).map(([k, v]: any) => [k, k === "eraser" || k === "wood" ? v : { ...v, color: x }])));
  const W = (p: Pt): Pt => ({ x: (p.x - cam.x) / cam.k, y: (p.y - cam.y) / cam.k });
  const pinchFn = (t: any[]) => {
    const a = t[0], b = t[1], d = Math.hypot(a.locationX - b.locationX, a.locationY - b.locationY) || 1;
    const m = { x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2 };
    if (!pinch.current) { live.current = null; setDraft(null); setOver({}); pinch.current = { d, m, cam }; return; }
    const s = pinch.current, k = Math.min(5, Math.max(0.2, (s.cam.k * d) / s.d));
    const wx = (s.m.x - s.cam.x) / s.cam.k, wy = (s.m.y - s.cam.y) / s.cam.k;
    setCam({ k, x: m.x - wx * k, y: m.y - wy * k });
  };
  const wheel = (e: any) => {
    const r = e.currentTarget?.getBoundingClientRect?.(), mx = (e.clientX ?? 0) - (r?.left ?? 0), my = (e.clientY ?? 0) - (r?.top ?? 0);
    const k = Math.min(5, Math.max(0.2, cam.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1))), wx = (mx - cam.x) / cam.k, wy = (my - cam.y) / cam.k;
    setCam({ k, x: mx - wx * k, y: my - wy * k });
  };
  const down = (sp: Pt) => {
    const p = W(sp);
    if (!board || form) return;
    if (["pen", "marker", "wood"].includes(tool)) live.current = { k: "draw", pts: [p.x, p.y] };
    else if (tool === "pipette") pipette(p);
    else if (tool === "eraser2") live.current = { k: "cut", pts: [p.x, p.y] };
    else if (tool === "eraser") { live.current = { k: "erase" }; const o = top(p); if (o) del(o, false); erase(p); }
    else if (SHAPES.includes(tool)) live.current = { k: "shape", s: p, from: top(p, true)?._id };
    else {
      const o = top(p), b = selO && !isArrow(selO.kind) && selO.kind !== "tip" ? box(selO) : null;
      if (b && Math.hypot(p.x - b.x - b.w, p.y - b.y - b.h) < 22 / cam.k) live.current = { k: "resize", id: selO._id, o: selO };
      else if (o) { setSel(o._id); live.current = { k: "move", id: o._id, o, s: p }; } else { setSel(null); live.current = { k: "pan", s: sp, c: cam }; }
    }
    if (live.current) setDraft({ ...live.current, p });
  };
  const move = (sp: Pt) => {
    const L = live.current; if (!L || pinch.current) return;
    const p = W(sp);
    if (L.k === "draw") L.pts.push(Math.round(p.x), Math.round(p.y));
    else if (L.k === "erase") erase(p);
    else if (L.k === "cut") L.pts.push(Math.round(p.x), Math.round(p.y));
    else if (L.k === "pan") setCam({ ...L.c, x: L.c.x + sp.x - L.s.x, y: L.c.y + sp.y - L.s.y });
    else if (L.k === "move") setOver((v) => ({ ...v, [L.id]: { x: L.o.x + p.x - L.s.x, y: L.o.y + p.y - L.s.y } }));
    else if (L.k === "resize") setOver((v) => ({ ...v, [L.id]: { w: Math.max(30, p.x - L.o.x), h: Math.max(24, p.y - L.o.y) } }));
    L.p = p; setDraft({ ...L });
  };
  const up = async () => {
    if (pinch.current) { pinch.current = null; return; }
    const L = live.current; live.current = null; setDraft(null); if (!L || !board || L.k === "pan") return;
    if (L.k === "draw") {
      if (L.pts.length === 2) L.pts.push(L.pts[0], L.pts[1]);
      await create(true, { tool, color: c.color, width: c.width, points: L.pts });
    } else if (L.k === "cut") {
      await cut(L.pts.length === 2 ? [...L.pts, ...L.pts] : L.pts, c.width / 2);
    } else if (L.k === "shape") {
      const p = L.p ?? L.s, ar = isArrow(tool); let w = p.x - L.s.x, h = p.y - L.s.y;
      if (ar && Math.hypot(w, h) < 10) return;
      if (!ar && Math.abs(w) < 8 && Math.abs(h) < 8) { w = 120; h = 80; }
      const to = ar ? top(p, true)?._id : undefined;
      const data: any = {
        kind: tool, x: ar ? L.s.x : Math.min(L.s.x, L.s.x + w), y: ar ? L.s.y : Math.min(L.s.y, L.s.y + h),
        w: ar ? w : Math.abs(w), h: ar ? h : Math.abs(h), style: { ...defStyle, stroke: c.color, sw: c.width, fill: ar ? "none" : "#FFFFFF" },
        ...(ar && L.from ? { fromId: L.from } : {}), ...(to && to !== L.from ? { toId: to } : {})
      };
      const ref = await create(false, data); setSel(ref.id); setTool("select"); setCtl(false); setGrp(null); setSheet(null);
    } else {
      const patch = over[L.id];
      if (!patch) { const now = Date.now(); if (L.k === "move" && lastTap.current.id === L.id && now - lastTap.current.t < 350) openEdit(L.o); lastTap.current = { id: L.id, t: now }; return; }
      push({ ref: { id: L.id }, op: "upd", before: Object.fromEntries(Object.keys(patch).map((k) => [k, L.o[k]])), after: patch });
      await patchO({ id: L.id, patch });
      setOver((v) => { const n = { ...v }; delete n[L.id]; return n; });
    }
  };
  H.current = { down, move, up, pinch: pinchFn };

  const ghost = draft?.k === "shape" ? (() => {
    const p = draft.p, ar = isArrow(tool);
    return {
      kind: tool, x: ar ? draft.s.x : Math.min(draft.s.x, p.x), y: ar ? draft.s.y : Math.min(draft.s.y, p.y),
      w: ar ? p.x - draft.s.x : Math.abs(p.x - draft.s.x), h: ar ? p.y - draft.s.y : Math.abs(p.y - draft.s.y),
      style: { ...defStyle, stroke: c.color, sw: c.width, fill: "none" }
    };
  })() : null;
  const sb = selO && (() => {
    if (!isArrow(selO.kind)) return box(selO); const { a, b } = ends(selO, map);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  })();
  const line = (s: any, k: any) => (
    <Path key={k} d={pathOf(s.points)} stroke={vis(s.color)} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={s.tool === "wood" ? 0.9 : s.tool === "marker" ? 0.4 : 1} />);
  const grain = (s: any, k: any) => s.tool === "wood" ? <Path key={k + "g"} d={pathOf(s.points)} stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={Math.max(1, s.width * 0.45)} strokeDasharray="1 6" fill="none" strokeLinecap="round" /> : null;
  const mono = Platform.OS === "android" ? "monospace" : "Courier";
  const inp = { borderWidth: 1, borderColor: "#C5CFE6", borderRadius: 8, padding: 8, color: "#1c2b4a", marginVertical: 6 };

  return (
    <View style={{ flex: 1 }} onLayout={(e) => { dim.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}>
      <View {...pan.panHandlers} {...({ onWheel: wheel } as any)} collapsable={false} style={{ flex: 1, backgroundColor: T.canvas }}>
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <G transform={`translate(${cam.x} ${cam.y}) scale(${cam.k})`}>
            {strokes.map((s, i) => [line(s, s._id ?? i), grain(s, s._id ?? i)])}
            {draft?.k === "draw" && [line({ tool, color: c.color, width: c.width, points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts }, "live"),
            grain({ tool, width: c.width, points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts }, "live")]}
            {draft?.k === "cut" && <Path d={pathOf(draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts)} stroke={T.canvas} strokeWidth={c.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            {objs.map((o) => <Shape key={o._id} o={o} m={map} />)}
            {ghost && <Shape o={ghost} m={map} />}
            {sb && <>
              <Rect x={sb.x - 4} y={sb.y - 4} width={sb.w + 8} height={sb.h + 8} fill="none" stroke={BLUE} strokeDasharray="5 4" />
              {!isArrow(selO.kind) && selO.kind !== "tip" && <Rect x={sb.x + sb.w - 6 / cam.k} y={sb.y + sb.h - 6 / cam.k} width={14 / cam.k} height={14 / cam.k} fill={BLUE} />}</>}
          </G>
        </Svg>
      </View>

      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: ins.top + 8, paddingBottom: 10, paddingHorizontal: 14, backgroundColor: st.accent, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => router.replace("/")}><Text style={{ color: "#fff", fontSize: 20 }}>←</Text></Pressable>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17, flex: 1 }}>{board?.name ?? "Loading..."}</Text>
        <Pressable onPress={() => router.push("/settings")}><Text style={{ color: "#fff", fontSize: 20 }}>⚙</Text></Pressable>
      </View>

      {(() => {
        const cur = [...DRAW, ...OBJ].find((d) => d[0] === tool), t0 = ins.top + 56;
        const choose = (t: Tool) => { setTool(t); setGrp(null); setSheet(null); };
        const flip = (g: "draw" | "obj") => { setGrp(grp === g ? null : g); setSheet(null); };
        const hasSize = tool !== "select" && tool !== "pipette";
        const sizeBtn = hasSize ? <Btn g="◉" sel={sheet === "size"} on={() => setSheet(sheet === "size" ? null : "size")} /> : null;
        const colorBtn = hasSize && !tool.startsWith("eraser") && tool !== "wood" ? <Btn g="🎨" sel={sheet === "color"} on={() => setSheet(sheet === "color" ? null : "color")} /> : null;
        if (!open) return <View style={[card, { left: 8, top: t0, borderRadius: 26, padding: 3 }]}><Btn g={cur ? cur[1] : "➤"} sel on={() => setOpen(true)} /></View>;
        return <>
          <View style={[card, hz ? { left: 8, bottom: 12, maxWidth: "96%" } : { left: 8, top: t0, maxHeight: "82%" }]}>
            <ScrollView ref={mainRef} horizontal={hz} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
              <Btn g="‹" on={() => { setOpen(false); setGrp(null); setSheet(null); }} />
              <Btn g="➤" sel={tool === "select"} on={() => choose("select")} />
              <Btn g={isDraw(tool) ? cur![1] : "✎"} sel={isDraw(tool)} on={() => flip("draw")} />
              <Btn g={isObj(tool) ? cur![1] : "▭"} sel={isObj(tool)} on={() => flip("obj")} />
              <Btn g="T" on={addText} /><Btn g="💡" on={addTip} /><Btn g="</>" on={addCode} /><Btn g="📎" on={addPin} />
              <View style={hz ? { width: 1, height: 28, alignSelf: "center", backgroundColor: T.border, marginHorizontal: 4 } : { height: 1, backgroundColor: T.border, marginVertical: 4 }} />
              <View style={{ opacity: undoS.current.length ? 1 : 0.3 }}><Btn g="↶" on={doUndo} /></View>
              <View style={{ opacity: redoS.current.length ? 1 : 0.3 }}><Btn g="↷" on={doRedo} /></View>
              <Pressable onPress={() => { setSheet(sheet === "scale" ? null : "scale"); setGrp(null); }} style={{ height: hz ? 42 : 34, width: hz ? 48 : undefined, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, color: T.text, fontWeight: sheet === "scale" ? "800" : "500" }}>{Math.round(cam.k * 100)}%</Text></Pressable>
            </ScrollView>
          </View>
          {grp === "draw" && <View style={[card, hz ? { left: 8, bottom: 64, flexDirection: "row", maxWidth: "96%" } : { left: 66, top: t0 + 44 }]}>
            <ScrollView ref={subRef} horizontal={hz} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>{DRAW.map(([k, g]) => <Btn key={k} g={g} sel={tool === k} on={() => choose(k)} />)}{colorBtn}{sizeBtn}</ScrollView></View>}
          {grp === "obj" && <View style={[card, hz ? { left: 8, bottom: 64, width: 190 } : { left: 66, top: t0 + 88, width: 190 }]}>
            {OBJ.map(([k, g, n]) => (
              <Pressable key={k} onPress={() => choose(k)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, backgroundColor: tool === k ? T.sel : "transparent" }}>
                <Text style={{ fontSize: 18, width: 24, textAlign: "center", color: T.text }}>{g}</Text><Text style={{ color: T.text }}>{n}</Text></Pressable>))}
            <View style={{ flexDirection: "row" }}>{colorBtn}{sizeBtn}</View></View>}
          {sheet && <View style={[card, { left: hz ? 8 : 66, bottom: hz ? 124 : 16, padding: 12 }]}>
            {sheet === "color" ? <View style={{ backgroundColor: "#fff", borderRadius: 10, padding: 8 }}><ColorPicker value={c.color} onChange={setColor} /></View> : sheet === "scale" ? <>
              <Text style={{ color: T.text, marginBottom: 4 }}>Scale {Math.round(cam.k * 100)}%</Text>
              <Slider v={Math.round(cam.k * 100)} min={20} max={500} on={setZoom} /></> : <>
              <Text style={{ color: T.text, marginBottom: 4 }}>{tool.startsWith("eraser") ? "Eraser size" : "Thickness"} {c.width}</Text>
              <Slider v={c.width} min={1} max={tool.startsWith("eraser") ? 80 : 40} on={(w: number) => setCfg({ ...cfg, [tool]: { ...c, width: w } })} />
              {!tool.startsWith("eraser") && tool !== "wood" && <Sw v={c.color} on={setColor} />}</>}
          </View>}
        </>;
      })()}

      {selO && tool === "select" && !form && (
        <View style={[card, { bottom: hz ? 72 : 16, alignSelf: "center", flexDirection: "row", gap: 16, paddingHorizontal: 20 }]}>
          {selO.kind === "tip" && <Pressable onPress={() => patchO({ id: selO._id, patch: { hidden: !selO.hidden } })}><Text style={{ color: BLUE, fontWeight: "800" }}>{selO.hidden ? "Show" : "Hide"}</Text></Pressable>}
          {(selO.kind === "pin" || selO.kind === "image") && selO.fileUrl && <Pressable onPress={() => Linking.openURL(selO.fileUrl)}><Text style={{ color: BLUE, fontWeight: "800" }}>Open</Text></Pressable>}
          {selO.kind === "code" && <Pressable onPress={() => Clipboard.setStringAsync(selO.code ?? "")}><Text style={{ color: BLUE, fontWeight: "800" }}>Copy</Text></Pressable>}
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
            {form.o.kind === "code" && <Pressable onPress={loadText} style={{ marginVertical: 4 }}><Text style={{ color: BLUE, fontWeight: "700" }}>Load text file…</Text></Pressable>}
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
