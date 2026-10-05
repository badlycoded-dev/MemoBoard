import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../services/api";
import { Inspector, ToolControl, Toolbar } from "../components/whiteboard/Panels";
import { Tool, SHAPES, defStyle, isArrow, box, ends, hit, Pt } from "../components/whiteboard/model";

const mk = (color: string, width: number) => ({ color, width });
const INK = "#12275C";
const init: Record<string, any> = { pen: mk(INK, 4), wood: mk("#7A4A21", 6), eraser: mk("", 18), rect: mk(INK, 3), round: mk(INK, 3),
  ellipse: mk(INK, 3), triangle: mk(INK, 3), arrow: mk(INK, 3), arrowThick: mk(INK, 10) };
const pathOf = (p: number[]) => { let d = `M${p[0]} ${p[1]}`; for (let i = 2; i < p.length; i += 2) d += ` L${p[i]} ${p[i + 1]}`; return d; };
const strip = ({ _id, _creationTime, boardId, fileUrl, ...d }: any) => d;
const anchor = (o: any, m: Map<string, any>) => {
  if (!isArrow(o.kind)) return box(o);
  const { a, b } = ends(o, m); return { x: (a.x + b.x) / 2 - 60, y: (a.y + b.y) / 2 - 20, w: 120, h: 40 };
};

function Shape({ o, m }: any) {
  const s = o.style, b = box(o), t = { fontSize: s.fs, fontWeight: s.bold ? 700 : 400, fill: s.tc };
  if (isArrow(o.kind)) {
    const { a, b: e } = ends(o, m);
    return <g><line x1={a.x} y1={a.y} x2={e.x} y2={e.y} stroke={s.stroke} strokeWidth={s.sw} markerEnd="url(#head)" />
      {o.text && <text x={(a.x + e.x) / 2} y={(a.y + e.y) / 2 - 8} textAnchor="middle" {...t}>{o.text}</text>}</g>;
  }
  const cp = { stroke: s.stroke, strokeWidth: s.sw, fill: s.fill };
  const el = o.kind === "ellipse" ? <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} {...cp} />
    : o.kind === "triangle" ? <polygon points={`${b.x + b.w / 2},${b.y} ${b.x + b.w},${b.y + b.h} ${b.x},${b.y + b.h}`} {...cp} />
    : <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={o.kind === "round" ? 18 : 0} {...cp} />;
  return <g>{el}
    {o.text && <foreignObject x={b.x} y={b.y} width={b.w} height={b.h} style={{ pointerEvents: "none" }}>
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 8, overflow: "hidden",
        whiteSpace: "pre-wrap", fontSize: s.fs, fontWeight: s.bold ? 700 : 400, color: s.tc }}>{o.text}</div></foreignObject>}
    {o.code && <text x={b.x + b.w - 30} y={b.y - 6} fontSize="13" fill="#2848E0">{"</>"}</text>}
    {o.fileUrl && <text x={b.x + b.w - 4} y={b.y - 6} textAnchor="end" fontSize="13">📎</text>}</g>;
}

export default function Whiteboard() {
  const { id } = useParams();
  const board = useQuery(api.boards.byPublicId, { publicId: id! });
  const args = board ? { boardId: board._id } : "skip";
  const strokesRaw = useQuery(api.strokes.list, args) ?? [];
  const objsRaw = useQuery(api.objects.list, args) ?? [];
  const addS = useMutation(api.strokes.add), rmS = useMutation(api.strokes.remove);
  const addO = useMutation(api.objects.add), rmO = useMutation(api.objects.remove), patchO = useMutation(api.objects.patch);
  const upUrl = useMutation(api.objects.uploadUrl);
  const [tool, setTool] = useState<Tool>("pen"), [ctl, setCtl] = useState(false), [cfg, setCfg] = useState(init);
  const [sel, setSel] = useState<string | null>(null), [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null), [over, setOver] = useState<Record<string, any>>({}), [pend, setPend] = useState<any[]>([]);
  const [, tick] = useState(0);
  const svg = useRef<SVGSVGElement>(null), live = useRef<any>(null), gone = useRef(new Set<string>());
  const undoS = useRef<any[]>([]), redoS = useRef<any[]>([]);

  const strokes = [...strokesRaw.filter((s: any) => !gone.current.has(s._id)), ...pend.filter((p) => p.isS)];
  const objs: any[] = [...objsRaw.filter((o: any) => !gone.current.has(o._id)).map((o: any) => ({ ...o, ...over[o._id] })), ...pend.filter((p) => !p.isS)];
  const map = new Map(objs.map((o) => [o._id, o]));
  const c = cfg[tool], selO = sel ? map.get(sel) : null, editO = edit ? map.get(edit) : null;
  const pt = (e: React.PointerEvent | React.MouseEvent): Pt => { const r = svg.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
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
  const patchSel = (p: any) => sel && patchO({ id: sel as any, patch: p });
  const commitText = (o: any, text: string) => { push({ ref: { id: o._id }, op: "upd", before: { text: o.text ?? "" }, after: { text } }); patchO({ id: o._id, patch: { text } }); };
  const upload = async (f: File) => {
    const r = await fetch(await upUrl(), { method: "POST", headers: { "Content-Type": f.type || "application/octet-stream" }, body: f });
    patchSel({ file: { storageId: (await r.json()).storageId, name: f.name } });
  };
  const pick = (k: Tool) => { if (k === tool) setCtl((v) => !v); else { setTool(k); setCtl(false); } };

  const erase = (p: Pt) => {
    const r = cfg.eraser.width;
    for (const s of strokes as any[]) { if (s.isS || gone.current.has(s._id)) continue;
      for (let i = 0; i < s.points.length; i += 2) if (Math.hypot(s.points[i] - p.x, s.points[i + 1] - p.y) < r + s.width / 2) { del(s, true); break; } }
  };
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!board || edit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pt(e);
    if (tool === "pen" || tool === "wood") live.current = { k: "draw", pts: [p.x, p.y] };
    else if (tool === "eraser") { live.current = { k: "erase" }; const o = top(p); if (o) del(o, false); erase(p); }
    else if (SHAPES.includes(tool)) live.current = { k: "shape", s: p, from: top(p, true)?._id };
    else {
      const o = top(p), b = selO && !isArrow(selO.kind) ? box(selO) : null;
      if (b && Math.hypot(p.x - b.x - b.w, p.y - b.y - b.h) < 12) live.current = { k: "resize", id: selO._id, o: selO };
      else if (o) { setSel(o._id); live.current = { k: "move", id: o._id, o, s: p }; } else setSel(null);
    }
    if (live.current) setDraft({ ...live.current, p });
  };
  const move = (e: React.PointerEvent) => {
    const L = live.current; if (!L) return; const p = pt(e);
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
      await create(true, { tool, color: c.color, width: c.width, points: L.pts, userId: "dev", createdAt: 0 } as any);
    } else if (L.k === "shape") {
      const p = L.p ?? L.s, ar = isArrow(tool); let w = p.x - L.s.x, h = p.y - L.s.y;
      if (ar && Math.hypot(w, h) < 10) return;
      if (!ar) { if (Math.abs(w) < 8 && Math.abs(h) < 8) { w = 120; h = 80; } }
      const to = ar ? top(p, true)?._id : undefined;
      const data: any = { kind: tool, x: ar ? L.s.x : Math.min(L.s.x, L.s.x + w), y: ar ? L.s.y : Math.min(L.s.y, L.s.y + h),
        w: ar ? w : Math.abs(w), h: ar ? h : Math.abs(h), style: { ...defStyle, stroke: c.color, sw: c.width, fill: ar ? "none" : "#FFFFFF" },
        ...(ar && L.from ? { fromId: L.from } : {}), ...(to && to !== L.from ? { toId: to } : {}) };
      const ref = await create(false, data); setSel(ref.id); setTool("select"); setCtl(false);
    } else {
      const patch = over[L.id]; if (!patch) return;
      push({ ref: { id: L.id }, op: "upd", before: Object.fromEntries(Object.keys(patch).map((k) => [k, L.o[k]])), after: patch });
      await patchO({ id: L.id, patch });
      setOver((v) => { const n = { ...v }; delete n[L.id]; return n; });
    }
  };
  const dbl = (e: React.MouseEvent) => { const o = top(pt(e)); if (o && tool === "select") { setSel(o._id); setEdit(o._id); } };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selO) del(selO, false);
      if (e.ctrlKey && e.key === "z") doUndo();
      if (e.ctrlKey && e.key === "y") doRedo();
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  });

  const ghost = draft?.k === "shape" ? (() => { const p = draft.p, ar = isArrow(tool);
    return { kind: tool, x: ar ? draft.s.x : Math.min(draft.s.x, p.x), y: ar ? draft.s.y : Math.min(draft.s.y, p.y),
      w: ar ? p.x - draft.s.x : Math.abs(p.x - draft.s.x), h: ar ? p.y - draft.s.y : Math.abs(p.y - draft.s.y),
      style: { ...defStyle, stroke: c.color, sw: c.width, fill: "none" } }; })() : null;
  const sb = selO && (() => { const a = anchor(selO, map); return isArrow(selO.kind) ? a : box(selO); })();
  const eb = editO && anchor(editO, map);
  const line = (s: any, k: any) => <path key={k} d={pathOf(s.points)} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinecap="round" strokeLinejoin="round"
    filter={s.tool === "wood" ? "url(#grain)" : undefined} opacity={s.tool === "wood" ? 0.92 : 1} />;

  return (
    <div className="wb">
      <svg ref={svg} onPointerDown={down} onPointerMove={move} onPointerUp={up} onDoubleClick={dbl} style={{ cursor: tool === "select" ? "default" : "crosshair" }}>
        <defs>
          <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke" /></marker>
          <filter id="grain" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <feTurbulence baseFrequency=".8" numOctaves="2" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.2 1.6" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
        </defs>
        {strokes.map((s: any, i) => line(s, s._id ?? i))}
        {draft?.k === "draw" && line({ tool, color: c.color, width: c.width, points: draft.pts.length === 2 ? [...draft.pts, ...draft.pts] : draft.pts }, "live")}
        {objs.map((o) => <Shape key={o._id} o={o} m={map} />)}
        {ghost && <Shape o={ghost} m={map} />}
        {sb && !editO && <g pointerEvents="none"><rect x={sb.x - 4} y={sb.y - 4} width={sb.w + 8} height={sb.h + 8} fill="none" stroke="#2848E0" strokeDasharray="5 4" />
          {!isArrow(selO.kind) && <rect x={sb.x + sb.w - 4} y={sb.y + sb.h - 4} width={10} height={10} fill="#2848E0" />}</g>}
      </svg>
      {editO && eb && <textarea className="edit" autoFocus defaultValue={editO.text ?? ""} onBlur={(e) => { commitText(editO, e.target.value); setEdit(null); }}
        style={{ left: eb.x, top: eb.y, width: Math.max(eb.w, 100), height: Math.max(eb.h, 40), fontSize: editO.style.fs, fontWeight: editO.style.bold ? 700 : 400, color: editO.style.tc }} />}
      <div className="top"><Link to="/">Back</Link><b style={{ color: INK }}>{board?.name ?? "Loading..."}</b></div>
      <Toolbar tool={tool} pick={pick} undo={doUndo} redo={doRedo} canU={undoS.current.length > 0} canR={redoS.current.length > 0} />
      {ctl && <ToolControl tool={tool} cfg={cfg} set={setCfg} />}
      {selO && tool === "select" && !edit && <Inspector o={selO} patch={patchSel} upload={upload} />}
    </div>
  );
}
