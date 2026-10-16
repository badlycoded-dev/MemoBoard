import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { canView, roleOf } from "./access";
import { getAuthUserId } from "@convex-dev/auth/server";
const owned = async (ctx: MutationCtx, id: Id<"boards">) => {
  const uid = await getAuthUserId(ctx);
  const b = await ctx.db.get(id);
  if (!uid || !b || b.ownerId !== uid) throw new Error("Not allowed");
  return b;
};
export const list = query({
  args: {},
  handler: async (ctx) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) return [];
    const owned = (await ctx.db.query("boards").withIndex("by_owner", (q) => q.eq("ownerId", uid)).order("desc").take(200)).map((b) => ({ ...b, role: "owner" as const }));
    const ms = await ctx.db.query("board_members").withIndex("by_user", (q) => q.eq("userId", uid)).take(200);
    const shared = (await Promise.all(ms.map(async (m) => { const b = await ctx.db.get(m.boardId); return b && b.access !== 1 ? { ...b, role: m.role } : null; }))).filter((b) => b !== null);
    return [...owned, ...shared];
  },
});
export const byPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const b = await ctx.db.query("boards").withIndex("by_public", (q) => q.eq("publicId", publicId)).unique();
    return (await canView(ctx, b)) ? { ...b!, role: (await roleOf(ctx, b)) ?? ("viewer" as const) } : null;
  },
});
export const create = mutation({
  args: {
    name: v.string(),
    type: v.optional(v.union(v.literal("task"), v.literal("whiteboard"))),
    mode: v.optional(v.union(v.literal("progress"), v.literal("multi"))),
    columns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { name, type, mode, columns }) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) throw new Error("Not signed in");
    const publicId = Math.random().toString(36).slice(2, 10);
    const boardId = await ctx.db.insert("boards", {
      publicId, type: type ?? "whiteboard", name, ownerId: uid, access: 2, createdAt: Date.now(),
      ...(type === "task" ? { mode: mode ?? "progress" } : {}),
    });
    if (type === "task") {
      const names = mode === "multi" && columns?.length ? columns : ["To do", "Doing", "Done"];
      for (let i = 0; i < names.length; i++) {
        const last = i === names.length - 1;
        const kind = mode === "multi" ? (last ? "done" : "custom") : ["todo", "doing", "done"][i];
        await ctx.db.insert("tk_columns", { boardId, name: names[i], order: i, kind });
      }
    }
    return publicId;
  },
});
export const setStyle = mutation({
  args: { id: v.id("boards"), style: v.optional(v.string()) },
  handler: async (ctx, { id, style }) => { await owned(ctx, id); await ctx.db.patch(id, { style }); },
});
export const rename = mutation({
  args: { id: v.id("boards"), name: v.string() },
  handler: async (ctx, { id, name }) => { await owned(ctx, id); await ctx.db.patch(id, { name }); },
});
export const setOptions = mutation({
  args: { id: v.id("boards"), showTrash: v.optional(v.boolean()) },
  handler: async (ctx, { id, showTrash }) => { await owned(ctx, id); await ctx.db.patch(id, { showTrash }); },
});
export const remove = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, { id }) => {
    await owned(ctx, id);
    await ctx.db.delete(id);
    await ctx.scheduler.runAfter(0, internal.boards.purge, { boardId: id });
  },
});
// Deletes a removed board's children in small batches so no single mutation hits Convex limits.
export const purge = internalMutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    let budget = 200;
    for (const t of ["tk_logs", "tk_items", "tk_columns", "wb_strokes", "wb_objects", "wb_drafts", "presence", "invite_links", "board_invites", "board_members"] as const) {
      const rows: any[] = await (ctx.db.query(t) as any).withIndex("by_board", (q: any) => q.eq("boardId", boardId)).take(budget);
      for (const r of rows) {
        if (t === "wb_objects" && r.file) await ctx.storage.delete(r.file.storageId).catch(() => {});
        await ctx.db.delete(r._id);
      }
      budget -= rows.length;
      if (budget <= 0) return void (await ctx.scheduler.runAfter(0, internal.boards.purge, { boardId }));
    }
  },
});
// Who can open the board: 2 private (members only), 3 anyone with the link, 4 public. Non-members are read-only.
export const setAccess = mutation({
  args: { id: v.id("boards"), access: v.union(v.literal(2), v.literal(3), v.literal(4)) },
  handler: async (ctx, { id, access }) => {
    const b = await owned(ctx, id);
    if (b.access === 1 || b.access === 0) throw new Error("This board's access is managed by an administrator");
    await ctx.db.patch(id, { access });
  },
});
