export type Tool = "select" | "pen" | "wood" | "eraser" | "rect" | "round" | "ellipse" | "triangle" | "arrow" | "arrowThick";
export const SHAPES = ["rect", "round", "ellipse", "triangle", "arrow", "arrowThick"];
export const defStyle = { stroke: "#12275C", fill: "#FFFFFF", sw: 3, fs: 18, bold: false, tc: "#12275C" };
export type Pt = { x: number; y: number };
export const isArrow = (k: string) => k.startsWith("arrow");
export const box = (o: any) => ({ x: Math.min(o.x, o.x + o.w), y: Math.min(o.y, o.y + o.h), w: Math.abs(o.w), h: Math.abs(o.h) });
// point where a ray from o's center toward (tx,ty) leaves o's box
export function edge(o: any, tx: number, ty: number): Pt {
  const b = box(o), cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const s = Math.min(b.w / 2 / Math.abs(dx || 1e-9), b.h / 2 / Math.abs(dy || 1e-9));
  return { x: cx + dx * s, y: cy + dy * s };
}
// arrow endpoints; linked ends follow their shapes
export function ends(o: any, m: Map<string, any>) {
  let a: Pt = { x: o.x, y: o.y }, b: Pt = { x: o.x + o.w, y: o.y + o.h };
  const f = o.fromId && m.get(o.fromId), t = o.toId && m.get(o.toId);
  if (f) a = edge(f, b.x, b.y);
  if (t) b = edge(t, a.x, a.y);
  return { a, b };
}
const dist = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
export const hit = (o: any, p: Pt, m: Map<string, any>) => {
  if (isArrow(o.kind)) { const { a, b } = ends(o, m); return dist(p, a, b) < 8 + o.style.sw / 2; }
  const b = box(o); return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
};
