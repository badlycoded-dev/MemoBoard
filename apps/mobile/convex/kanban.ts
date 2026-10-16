import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { cleanPatch, editBoard, viewBoard } from "./access";

const log = (ctx: any, it: any, by: string, action: string, info?: string) =>
  ctx.db.insert("tk_logs", { boardId: it.boardId, taskId: it._id, by, action, info, at: Date.now() });
const cols = (ctx: any, boardId: any) =>
  ctx.db.query("tk_columns").withIndex("by_board", (q: any) => q.eq("boardId", boardId)).collect();

// ---- columns ----
export const colList = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => !(await viewBoard(ctx, boardId)) ? [] : (await cols(ctx, boardId)).sort((a: any, b: any) => a.order - b.order),
});
export const colAdd = mutation({
  args: { boardId: v.id("boards"), name: v.string() },
  handler: async (ctx, { boardId, name }) => {
    await editBoard(ctx, boardId);
    const all = await cols(ctx, boardId);
    const order = Math.max(-1, ...all.map((c: any) => c.order)) + 1;
    return ctx.db.insert("tk_columns", { boardId, name, order, kind: "custom" });
  },
});
export const colUpdate = mutation({
  args: { id: v.id("tk_columns"), name: v.optional(v.string()), color: v.optional(v.string()) },
  handler: async (ctx, { id, ...p }) => {
    const c = await ctx.db.get(id);
    if (!c) return;
    await editBoard(ctx, c.boardId);
    await ctx.db.patch(id, p);
  },
});
export const colMove = mutation({
  args: { id: v.id("tk_columns"), dir: v.number() },
  handler: async (ctx, { id, dir }) => {
    const c: any = await ctx.db.get(id);
    await editBoard(ctx, c.boardId);
    const all = (await cols(ctx, c.boardId)).sort((a: any, b: any) => a.order - b.order);
    const i = all.findIndex((x: any) => x._id === id), j = i + dir;
    if (j < 0 || j >= all.length) return;
    await ctx.db.patch(all[i]._id, { order: all[j].order });
    await ctx.db.patch(all[j]._id, { order: all[i].order });
  },
});
export const colRemove = mutation({
  args: { id: v.id("tk_columns"), toId: v.id("tk_columns") },
  handler: async (ctx, { id, toId }) => {
    const c: any = await ctx.db.get(id);
    const target: any = await ctx.db.get(toId);
    await editBoard(ctx, c.boardId);
    if (!target || target.boardId !== c.boardId || id === toId) throw new Error("Invalid target column");
    const items = await ctx.db.query("tk_items").withIndex("by_column", (q) => q.eq("columnId", id)).collect();
    for (const it of items) await ctx.db.patch(it._id, { columnId: toId });
    await ctx.db.delete(id);
  },
});

// ---- items ----
export const itemList = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) =>
    !(await viewBoard(ctx, boardId)) ? [] : ctx.db.query("tk_items").withIndex("by_board", (q) => q.eq("boardId", boardId)).collect(),
});
export const itemAdd = mutation({
  args: { boardId: v.id("boards"), columnId: v.id("tk_columns"), title: v.string(), by: v.string() },
  handler: async (ctx, { boardId, columnId, title, by }) => {
    await editBoard(ctx, boardId);
    const now = Date.now();
    const col: any = await ctx.db.get(columnId);
    if (!col || col.boardId !== boardId) throw new Error("Not allowed");
    const done = col.kind === "done";
    const id = await ctx.db.insert("tk_items", {
      boardId, columnId, title, importance: 1, status: done ? "done" : "open",
      createdBy: by, createdAt: now, updatedAt: now, ...(done ? { completedAt: now } : {}),
    });
    await log(ctx, { _id: id, boardId }, by, "created", `in ${col.name}`);
    return id;
  },
});
const EDITABLE = ["title", "description", "content", "importance", "color", "border", "tint"];
const nul = (t: any) => v.optional(v.union(v.null(), t));
export const itemUpdate = mutation({
  args: {
    id: v.id("tk_items"), by: v.string(),
    patch: v.object({ title: v.optional(v.string()), description: nul(v.string()), content: nul(v.string()), importance: v.optional(v.number()), color: nul(v.string()), border: nul(v.number()), tint: nul(v.boolean()) }),
  },
  handler: async (ctx, { id, patch, by }) => {
    const it: any = await ctx.db.get(id);
    await editBoard(ctx, it.boardId);
    const patchClean = cleanPatch(patch);
    const clean: any = { updatedAt: Date.now() };
    const changed: string[] = [];
    for (const k of EDITABLE) if (k in patch && (patchClean[k] ?? undefined) !== it[k]) { clean[k] = patchClean[k]; changed.push(k); }
    if (!changed.length) return;
    await ctx.db.patch(id, clean);
    await log(ctx, it, by, "edited", changed.join(", "));
  },
});
export const itemMove = mutation({
  args: { id: v.id("tk_items"), columnId: v.id("tk_columns"), by: v.string() },
  handler: async (ctx, { id, columnId, by }) => {
    const it: any = await ctx.db.get(id);
    await editBoard(ctx, it.boardId);
    if (it.columnId === columnId) return;
    const from: any = await ctx.db.get(it.columnId), to: any = await ctx.db.get(columnId);
    if (!to || to.boardId !== it.boardId) throw new Error("Invalid column");
    const patch: any = { columnId, updatedAt: Date.now() };
    if (it.status !== "trashed") {
      if (to.kind === "done") { patch.status = "done"; patch.completedAt = Date.now(); }
      else if (it.status === "done") { patch.status = it.claimedBy ? "claimed" : "open"; patch.completedAt = undefined; }
    }
    await ctx.db.patch(id, patch);
    await log(ctx, it, by, "moved", `${from?.name} → ${to.name}`);
    if (patch.status === "done") await log(ctx, it, by, "completed");
  },
});
export const itemClaim = mutation({
  args: { id: v.id("tk_items"), by: v.string(), claim: v.boolean() },
  handler: async (ctx, { id, by, claim }) => {
    const it: any = await ctx.db.get(id);
    await editBoard(ctx, it.boardId);
    const board: any = await ctx.db.get(it.boardId);
    const patch: any = { updatedAt: Date.now() };
    if (claim) { patch.claimedBy = by; if (it.status === "open") patch.status = "claimed"; }
    else { patch.claimedBy = undefined; if (it.status === "claimed") patch.status = "open"; }
    if (claim && board.mode === "progress") {
      const all = await cols(ctx, it.boardId);
      const cur = all.find((c: any) => c._id === it.columnId), doing = all.find((c: any) => c.kind === "doing");
      if (cur?.kind === "todo" && doing) {
        patch.columnId = doing._id;
        await log(ctx, it, by, "moved", `${cur.name} → ${doing.name}`);
      }
    }
    await ctx.db.patch(id, patch);
    await log(ctx, it, by, claim ? "claimed" : "unclaimed");
  },
});
export const itemFinish = mutation({
  args: { id: v.id("tk_items"), by: v.string(), done: v.boolean() },
  handler: async (ctx, { id, by, done }) => {
    const it: any = await ctx.db.get(id);
    await editBoard(ctx, it.boardId);
    const board: any = await ctx.db.get(it.boardId);
    const all = await cols(ctx, it.boardId);
    const patch: any = { updatedAt: Date.now() };
    if (done) { patch.status = "done"; patch.completedAt = Date.now(); }
    else { patch.status = it.claimedBy ? "claimed" : "open"; patch.completedAt = undefined; }
    if (board.mode === "progress") {
      const target = all.find((c: any) => c.kind === (done ? "done" : it.claimedBy ? "doing" : "todo"));
      const cur = all.find((c: any) => c._id === it.columnId);
      if (target && target._id !== it.columnId) {
        patch.columnId = target._id;
        await log(ctx, it, by, "moved", `${cur?.name} → ${target.name}`);
      }
    }
    await ctx.db.patch(id, patch);
    await log(ctx, it, by, done ? "completed" : "reopened");
  },
});
export const itemTrash = mutation({
  args: { id: v.id("tk_items"), by: v.string() },
  handler: async (ctx, { id, by }) => {
    const it: any = await ctx.db.get(id);
    await editBoard(ctx, it.boardId);
    await ctx.db.patch(id, { prevStatus: it.status, status: "trashed", updatedAt: Date.now() });
    await log(ctx, it, by, "trashed");
  },
});
export const itemRestore = mutation({
  args: { id: v.id("tk_items"), by: v.string() },
  handler: async (ctx, { id, by }) => {
    const it: any = await ctx.db.get(id);
    await editBoard(ctx, it.boardId);
    await ctx.db.patch(id, { status: it.prevStatus ?? "open", prevStatus: undefined, updatedAt: Date.now() });
    await log(ctx, it, by, "restored");
  },
});
export const itemPurge = mutation({
  args: { id: v.id("tk_items") },
  handler: async (ctx, { id }) => {
    const it = await ctx.db.get(id);
    if (!it) return;
    await editBoard(ctx, it.boardId);
    const logs = await ctx.db.query("tk_logs").withIndex("by_task", (q) => q.eq("taskId", id)).collect();
    for (const l of logs) await ctx.db.delete(l._id);
    await ctx.db.delete(id);
  },
});
export const logList = query({
  args: { taskId: v.id("tk_items") },
  handler: async (ctx, { taskId }) => {
    const t = await ctx.db.get(taskId);
    if (!t || !(await viewBoard(ctx, t.boardId))) return [];
    return (await ctx.db.query("tk_logs").withIndex("by_task", (q) => q.eq("taskId", taskId)).collect()).sort((a, b) => b.at - a.at);
  },
});

// ---- files (for markdown content) ----
export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await getAuthUserId(ctx))) throw new Error("Not allowed");
    return ctx.storage.generateUploadUrl();
  },
});
export const urlOf = mutation({ args: { storageId: v.id("_storage") }, handler: (ctx, { storageId }) => ctx.storage.getUrl(storageId) });
