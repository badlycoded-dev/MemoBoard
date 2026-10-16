import { useRef } from "react";

/** Stable wrapper around a mutation: does nothing while `blocked()` (e.g. viewer role) and turns
 *  rejections into onError() instead of uncaught promise errors. */
export function useGuard(fn: any, blocked: () => boolean, onError: () => void) {
  const f = useRef(fn), b = useRef(blocked), e = useRef(onError);
  f.current = fn; b.current = blocked; e.current = onError;
  return useRef((...a: any[]) => (b.current() ? Promise.resolve(null) : Promise.resolve(f.current(...a)).catch(() => { e.current(); return null; }))).current;
}
