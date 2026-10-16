import { useEffect, useRef } from "react";

/** Holds an editing lock on `id` while it is set: re-taken every 15s, released on change/unmount.
 *  `onDenied(by)` fires if someone else holds it. Errors (e.g. viewer role) are ignored. */
export function useLock(id: string | null, lock: (a: { id: any }) => Promise<any>, unlock: (a: { id: any }) => Promise<any>, onDenied: (by: string) => void) {
  const deny = useRef(onDenied);
  deny.current = onDenied;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const grab = () => lock({ id }).then((r) => { if (alive && r && r.ok === false && r.by) deny.current(r.by); }).catch(() => {});
    grab();
    const t = setInterval(grab, 15000);
    return () => { alive = false; clearInterval(t); unlock({ id }).catch(() => {}); };
  }, [id]);
}
