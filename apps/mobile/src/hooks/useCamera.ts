import { MutableRefObject, useRef, useState } from "react";
import type { Pt } from "@/components/whiteboard/model";

export type Camera = { x: number; y: number; k: number };
const clampZoom = (k: number) => Math.min(5, Math.max(0.2, k));

/** Pan / zoom state of the board plus the gesture helpers that change it. */
export function useCamera(
  viewSize: MutableRefObject<{ w: number; h: number }>,
  onPinchStart: () => void,
) {
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, k: 1 });
  const pinch = useRef<any>(null);

  /** Screen point -> board (world) point. */
  const toWorld = (p: Pt): Pt => ({ x: (p.x - cam.x) / cam.k, y: (p.y - cam.y) / cam.k });

  /** Zoom to `pct` percent around the center of the view. */
  const setZoom = (pct: number) => {
    const k = pct / 100;
    const cx = viewSize.current.w / 2;
    const cy = viewSize.current.h / 2;
    const wx = (cx - cam.x) / cam.k;
    const wy = (cy - cam.y) / cam.k;
    setCam({ k, x: cx - wx * k, y: cy - wy * k });
  };

  /** Two-finger pinch: zooms around the midpoint and drags with it. */
  const pinchTo = (touches: any[]) => {
    const [a, b] = touches;
    const d = Math.hypot(a.locationX - b.locationX, a.locationY - b.locationY) || 1;
    const mid = { x: (a.locationX + b.locationX) / 2, y: (a.locationY + b.locationY) / 2 };
    if (!pinch.current) {
      onPinchStart();
      pinch.current = { d, m: mid, cam };
      return;
    }
    const s = pinch.current;
    const k = clampZoom((s.cam.k * d) / s.d);
    const wx = (s.m.x - s.cam.x) / s.cam.k;
    const wy = (s.m.y - s.cam.y) / s.cam.k;
    setCam({ k, x: mid.x - wx * k, y: mid.y - wy * k });
  };

  /** Mouse-wheel zoom around the cursor (web). */
  const wheel = (e: any) => {
    const r = e.currentTarget?.getBoundingClientRect?.();
    const mx = (e.clientX ?? 0) - (r?.left ?? 0);
    const my = (e.clientY ?? 0) - (r?.top ?? 0);
    const k = clampZoom(cam.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    const wx = (mx - cam.x) / cam.k;
    const wy = (my - cam.y) / cam.k;
    setCam({ k, x: mx - wx * k, y: my - wy * k });
  };

  return { cam, setCam, pinch, toWorld, setZoom, pinchTo, wheel };
}
