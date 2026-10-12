export type Tool =
  | "select"
  | "pen"
  | "marker"
  | "wood"
  | "eraser"
  | "eraser2"
  | "pipette"
  | "rect"
  | "round"
  | "ellipse"
  | "triangle"
  | "arrow"
  | "arrowThick"
  | "line"
  | "text"
  | "tip"
  | "code"
  | "emoji";
export const SHAPES = ["rect", "round", "ellipse", "triangle", "arrow", "arrowThick", "line"];
export const defStyle = {
  stroke: "#12275C",
  fill: "#FFFFFF",
  sw: 3,
  fs: 18,
  bold: false,
  tc: "#12275C",
};
export type Pt = { x: number; y: number };
export const isArrow = (k: string) => k.startsWith("arrow") || k === "line";
export const box = (o: any) =>
  o.kind === "tip"
    ? { x: o.x, y: o.y, w: 190, h: 44 }
    : {
        x: Math.min(o.x, o.x + o.w),
        y: Math.min(o.y, o.y + o.h),
        w: Math.abs(o.w),
        h: Math.abs(o.h),
      };
// point where a ray from o's center toward (tx,ty) leaves o's box
export function edge(o: any, tx: number, ty: number): Pt {
  const b = box(o),
    cx = b.x + b.w / 2,
    cy = b.y + b.h / 2,
    dx = tx - cx,
    dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min(b.w / 2 / Math.abs(dx || 1e-9), b.h / 2 / Math.abs(dy || 1e-9));
  return { x: cx + dx * s, y: cy + dy * s };
}
// arrow endpoints; linked ends follow their shapes
export function ends(o: any, m: Map<string, any>) {
  let a: Pt = { x: o.x, y: o.y },
    b: Pt = { x: o.x + o.w, y: o.y + o.h };
  const f = o.fromId && m.get(o.fromId),
    t = o.toId && m.get(o.toId);
  if (f) a = edge(f, b.x, b.y);
  if (t) b = edge(t, a.x, a.y);
  return { a, b };
}
const dist = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
export const hit = (o: any, p: Pt, m: Map<string, any>) => {
  if (isArrow(o.kind)) {
    const { a, b } = ends(o, m);
    return dist(p, a, b) < 8 + o.style.sw / 2;
  }
  if (o.kind === "tip") {
    if (Math.hypot(p.x - o.x - o.w, p.y - o.y - o.h) < 18) return true;
    if (o.hidden) return false;
  }
  const b = box(o);
  const q = toLocal(o, p);
  return q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h;
};

const rotPt = (p: Pt, c: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180,
    dx = p.x - c.x,
    dy = p.y - c.y;
  return {
    x: c.x + dx * Math.cos(a) - dy * Math.sin(a),
    y: c.y + dx * Math.sin(a) + dy * Math.cos(a),
  };
};
const centerOf = (o: any): Pt => {
  const b = box(o);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};
const transformable = (o: any) => !isArrow(o.kind) && o.kind !== "tip";

/** Maps a world point into the item's own (unrotated, unmirrored) frame. */
export function toLocal(o: any, p: Pt): Pt {
  if (!transformable(o) || !(o.rot || o.flipX || o.flipY)) return p;
  const c = centerOf(o),
    q = rotPt(p, c, -(o.rot ?? 0));
  return { x: o.flipX ? 2 * c.x - q.x : q.x, y: o.flipY ? 2 * c.y - q.y : q.y };
}

/** Drag handles: 8 edge/corner points plus a rotate handle for boxes, both ends for arrows and lines. */
function allHandles(o: any, m: Map<string, any>): { id: string; x: number; y: number }[] {
  if (isArrow(o.kind)) {
    const { a, b } = ends(o, m);
    return [
      { id: "start", ...a },
      { id: "end", ...b },
    ];
  }
  const b = box(o),
    c = centerOf(o),
    r = b.x + b.w,
    d = b.y + b.h;
  const at = (id: string, x: number, y: number) => ({ id, ...rotPt({ x, y }, c, o.rot ?? 0) });
  return [
    at("nw", b.x, b.y),
    at("n", c.x, b.y),
    at("ne", r, b.y),
    at("e", r, c.y),
    at("se", r, d),
    at("s", c.x, d),
    at("sw", b.x, d),
    at("w", b.x, c.y),
    at("rot", c.x, b.y - 32),
  ];
}

/** Geometry patch produced by dragging `handle` of item `o` to world point `p`. */
export function resized(o: any, handle: string, p: Pt) {
  if (isArrow(o.kind)) {
    return handle === "start"
      ? { x: p.x, y: p.y, w: o.x + o.w - p.x, h: o.y + o.h - p.y }
      : { w: p.x - o.x, h: p.y - o.y };
  }
  const c = centerOf(o);
  if (handle === "rot")
    return { rot: Math.round((Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90) };
  const q = rotPt(p, c, -(o.rot ?? 0)),
    b = box(o);
  if (isPinLike(o)) {
    // Pins scale proportionally from a corner; the opposite corner stays fixed.
    const west = handle.includes("w"),
      north = handle.includes("n");
    const fx = west ? b.x + b.w : b.x,
      fy = north ? b.y + b.h : b.y;
    const k = Math.max(Math.abs(q.x - fx) / b.w, Math.abs(q.y - fy) / b.h, 0.3);
    const pw = b.w * k,
      ph = b.h * k;
    const pl = west ? fx - pw : fx,
      pt = north ? fy - ph : fy;
    const pm = rotPt({ x: pl + pw / 2, y: pt + ph / 2 }, c, o.rot ?? 0);
    return { x: pm.x - pw / 2, y: pm.y - ph / 2, w: pw, h: ph };
  }
  let l = b.x,
    t = b.y,
    r = b.x + b.w,
    d = b.y + b.h;
  if (handle.includes("w")) l = Math.min(q.x, r - 30);
  if (handle.includes("e")) r = Math.max(q.x, l + 30);
  if (handle.includes("n")) t = Math.min(q.y, d - 24);
  if (handle.includes("s")) d = Math.max(q.y, t + 24);
  const w = r - l,
    h = d - t,
    mid = rotPt({ x: l + w / 2, y: t + h / 2 }, c, o.rot ?? 0);
  return { x: mid.x - w / 2, y: mid.y - h / 2, w, h };
}

/** Pins, file chips and images: scalable only from the corners. */
export const isPinLike = (o: any) => o.kind === "pin" || o.kind === "image" || o.kind === "link";

/** Drag handles shown for a selected item (corner handles only for pins). */
export function handlesOf(o: any, m: Map<string, any>) {
  const all = allHandles(o, m);
  return isPinLike(o) ? all.filter((h) => h.id.length === 2 || h.id === "rot") : all;
}

/** Rotates a line or arrow about its middle by `deg` degrees (for lines without linked ends). */
export function rotatedLine(o: any, deg: number) {
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  const a = rotPt({ x: o.x, y: o.y }, c, deg);
  const b = rotPt({ x: o.x + o.w, y: o.y + o.h }, c, deg);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}
