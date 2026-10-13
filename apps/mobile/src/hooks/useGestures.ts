import { useRef } from "react";
import { Linking, PanResponder } from "react-native";
import * as Clipboard from "expo-clipboard";
import { SHAPES, defStyle, isArrow, Pt, handlesOf, resized } from "@/components/whiteboard/model";
import { actionAt, strip, segD } from "@/components/whiteboard/utils";

/** Touch gestures of the board: drawing, erasing, moving, resizing, dropping new items. */
export function useGestures(ctx: any) {
  const {
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
  } = ctx;
  const H = useRef<any>({});

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
      setCfg({ ...cfg, pen: { ...cfg.pen, color: best } });
      setTool("pen");
    }
  };
  // pen / marker / wood each keep their own color; shapes and other tools share one.
  const OWN = ["pen", "marker", "wood"];
  const setColor = (x: string) =>
    setCfg(
      Object.fromEntries(
        Object.entries(cfg).map(([k, v]: any) => [
          k,
          k === "eraser" || k === "eraser2" || (OWN.includes(tool) ? k !== tool : OWN.includes(k))
            ? v
            : { ...v, color: x },
        ]),
      ),
    );
  /** Runs a create action at board point `p` instead of the view center. */
  const dropAt = (action: () => void, p: Pt) => {
    dropPoint.current = p;
    action();
    dropPoint.current = null;
  };
  const down = (sp: Pt) => {
    const p = W(sp);
    if (!board || form) return;
    if (["pen", "marker", "wood"].includes(tool)) live.current = { k: "draw", pts: [p.x, p.y] };
    else if (tool === "text" || tool === "tip" || tool === "code")
      dropAt(tool === "text" ? addText : tool === "tip" ? addTip : addCode, p);
    else if (tool === "pin") dropAt(() => addPin(pinMime.current), p);
    else if (tool === "emoji") {
      emojiAt.current = p;
      setEmojiPicker(true);
    } else if (tool === "pipette") pipette(p);
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

  return { setColor, change, pan };
}
