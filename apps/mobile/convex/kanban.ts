import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const log = (ctx: any, it: any, by: string, action: string, info?: string) =>
  ctx.db.insert("tk_logs", { boardId: it.boardId, taskId: it._id, by, action, info, at: Date.now() });
const cols = (ctx: any, boardId: any) =>
  ctx.db.query("tk_columns").withIndex("by_board", (q: any) => q.eq("boardId", boardId)).collect();

// ---- columns ----
export const colList = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => (await cols(ctx, boardId)).sort((a: any, b: any) => a.order - b.order),
});
export const colAdd = mutation({
  args: { boardId: v.id("boards"), name: v.string() },
  handler: async (ctx, { boardId, name }) => {
    const all = await cols(ctx, boardId);
    const order = Math.max(-1, ...all.map((c: any) => c.order)) + 1;
    return ctx.db.insert("tk_columns", { boardId, name, order, kind: "custom" });
  },
});
export const colUpdate = mutation({
  args: { id: v.id("tk_columns"), name: v.optional(v.string()), color: v.optional(v.string()) },
  handler: (ctx, { id, ...p }) => ctx.db.patch(id, p),
});
export const colMove = mutation({
  args: { id: v.id("tk_columns"), dir: v.number() },
  handler: async (ctx, { id, dir }) => {
    const c: any = await ctx.db.get(id);
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
    const items = await ctx.db.query("tk_items").withIndex("by_board", (q) => q.eq("boardId", c.boardId)).collect();
    for (const it of items) if (it.columnId === id) await ctx.db.patch(it._id, { columnId: toId });
    await ctx.db.delete(id);
  },
});

// ---- items ----
export const itemList = query({
  args: { boardId: v.id("boards") },
  handler: (ctx, { boardId }) => ctx.db.query("tk_items").withIndex("by_board", (q) => q.eq("boardId", boardId)).collect(),
});
export const itemAdd = mutation({
  args: { boardId: v.id("boards"), columnId: v.id("tk_columns"), title: v.string(), by: v.string() },
  handler: async (ctx, { boardId, columnId, title, by }) => {
    const now = Date.now();
    const col: any = await ctx.db.get(columnId);
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
export const itemUpdate = mutation({
  args: { id: v.id("tk_items"), patch: v.any(), by: v.string() },
  handler: async (ctx, { id, patch, by }) => {
    const it: any = await ctx.db.get(id);
    const clean: any = { updatedAt: Date.now() };
    const changed: string[] = [];
    for (const k of EDITABLE) if (k in patch && (patch[k] ?? undefined) !== it[k]) { clean[k] = patch[k] ?? undefined; changed.push(k); }
    if (!changed.length) return;
    await ctx.db.patch(id, clean);
    await log(ctx, it, by, "edited", changed.join(", "));
  },
});
export const itemMove = mutation({
  args: { id: v.id("tk_items"), columnId: v.id("tk_columns"), by: v.string() },
  handler: async (ctx, { id, columnId, by }) => {
    const it: any = await ctx.db.get(id);
    if (it.columnId === columnId) return;
    const from: any = await ctx.db.get(it.columnId), to: any = await ctx.db.get(columnId);
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
    await ctx.db.patch(id, { prevStatus: it.status, status: "trashed", updatedAt: Date.now() });
    await log(ctx, it, by, "trashed");
  },
});
export const itemRestore = mutation({
  args: { id: v.id("tk_items"), by: v.string() },
  handler: async (ctx, { id, by }) => {
    const it: any = await ctx.db.get(id);
    await ctx.db.patch(id, { status: it.prevStatus ?? "open", prevStatus: undefined, updatedAt: Date.now() });
    await log(ctx, it, by, "restored");
  },
});
export const itemPurge = mutation({
  args: { id: v.id("tk_items") },
  handler: async (ctx, { id }) => {
    const logs = await ctx.db.query("tk_logs").withIndex("by_task", (q) => q.eq("taskId", id)).collect();
    for (const l of logs) await ctx.db.delete(l._id);
    await ctx.db.delete(id);
  },
});
export const logList = query({
  args: { taskId: v.id("tk_items") },
  handler: async (ctx, { taskId }) =>
    (await ctx.db.query("tk_logs").withIndex("by_task", (q) => q.eq("taskId", taskId)).collect()).sort((a, b) => b.at - a.at),
});

// ---- files (for markdown content) ----
export const uploadUrl = mutation({ args: {}, handler: (ctx) => ctx.storage.generateUploadUrl() });
export const urlOf = mutation({ args: { storageId: v.id("_storage") }, handler: (ctx, { storageId }) => ctx.storage.getUrl(storageId) });
