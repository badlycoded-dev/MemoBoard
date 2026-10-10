import { INK } from "@/theme/theme";
import type { IconName } from "./controls";
import type { Tool } from "./model";

export const PAL = [
  INK,
  "#E4572E",
  "#2BA84A",
  "#8E44AD",
  "#F2A900",
  "#1E88E5",
  "#7A4A21",
  "#111111",
  "#FFFFFF",
  "#FF8FB1",
  "#7FD6C2",
  "#C9D6F2",
];
export const mk = (color: string, width: number) => ({ color, width });
export const INITIAL_TOOL_CONFIG: Record<string, any> = {
  pen: mk(INK, 4),
  marker: mk("#F2A900", 14),
  wood: mk("#111111", 6),
  eraser: mk("", 18),
  eraser2: mk("", 18),
  pipette: mk("", 1),
  rect: mk(INK, 3),
  round: mk(INK, 3),
  ellipse: mk(INK, 3),
  triangle: mk(INK, 3),
  arrow: mk(INK, 3),
  arrowThick: mk(INK, 10),
};
export const DRAW_TOOLS: [Tool, IconName, string][] = [
  ["pen", "pen", "Pen"],
  ["marker", "marker", "Marker"],
  ["wood", "pencil", "Wooden pen"],
  ["eraser", "eraser", "Eraser (lines)"],
  ["eraser2", "eraser-variant", "Eraser (parts)"],
  ["pipette", "eyedropper", "Pipette"],
];
export const OBJECT_TOOLS: [Tool, IconName, string][] = [
  ["rect", "rectangle-outline", "Rectangle"],
  ["round", "square-rounded-outline", "Rounded rectangle"],
  ["ellipse", "circle-outline", "Circle"],
  ["triangle", "triangle-outline", "Triangle"],
  ["arrow", "arrow-right", "Thin arrow"],
  ["arrowThick", "arrow-right-bold", "Thick arrow"],
  ["line", "minus", "Line"],
];
export const isDraw = (t: Tool) => DRAW_TOOLS.some((d) => d[0] === t),
  isObj = (t: Tool) => OBJECT_TOOLS.some((d) => d[0] === t);
