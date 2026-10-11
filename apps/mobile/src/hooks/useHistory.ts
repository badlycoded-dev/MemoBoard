import { MutableRefObject, useRef, useState } from "react";

type Ops = {
  addS: any;
  rmS: any;
  addO: any;
  rmO: any;
  patchO: any;
  boardId?: string;
  gone: MutableRefObject<Set<string>>;
};

/**
 * Undo/redo stack for board edits. An entry is { op: "add" | "del" | "upd" | "batch", ref, s, data,
 * before, after, items }; `s` marks strokes, otherwise the entry is an object.
 */
export function useHistory(ops: Ops) {
  const undoStack = useRef<any[]>([]);
  const redoStack = useRef<any[]>([]);
  const [, rerender] = useState(0);

  const push = (entry: any) => {
    undoStack.current.push(entry);
    redoStack.current = [];
  };

  const apply = async (e: any, undoing: boolean): Promise<void> => {
    if (e.op === "batch") {
      for (const item of undoing ? [...e.items].reverse() : e.items) await apply(item, undoing);
      return;
    }
    if (e.op === "upd") return ops.patchO({ id: e.ref.id, patch: undoing ? e.before : e.after });
    if ((e.op === "add") === !undoing) {
      e.ref.id = String(await (e.s ? ops.addS : ops.addO)({ boardId: ops.boardId, ...e.data }));
    } else {
      ops.gone.current.add(e.ref.id);
      await (e.s ? ops.rmS : ops.rmO)({ id: e.ref.id });
    }
  };

  const undo = async () => {
    const e = undoStack.current.pop();
    if (!e) return;
    await apply(e, true);
    redoStack.current.push(e);
    rerender((n) => n + 1);
  };

  const redo = async () => {
    const e = redoStack.current.pop();
    if (!e) return;
    await apply(e, false);
    undoStack.current.push(e);
    rerender((n) => n + 1);
  };

  return {
    push,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  };
}
