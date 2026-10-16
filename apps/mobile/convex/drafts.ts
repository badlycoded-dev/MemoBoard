import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { cleanPatch, editBoard, heldByOther, roleOf, viewBoard } from "./access";

// Edits that lost a conflict. Each user sees and manages their own drafts.
export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const uid = await getAuthUserId(ctx);
    if (!uid || !(await viewBoard(ctx, boardId))) return [];
    const rows = (await ctx.db.query("wb_drafts").withIndex("by_board", (q) => q.eq("boardId", boardId)).take(5)).filter((d) => d.userId === uid);
    return Promise.all(rows.map(async (d) => ({ _id: d._id, createdAt: d.createdAt, patch: d.patch, kind: (await ctx.db.get(d.objectId))?.kind ?? "deleted item" })));
  },
});
export const apply = mutation({
  args: { id: v.id("wb_drafts") },
  handler: async (ctx, { id }) => {
    const d = await ctx.db.get(id);
    const uid = await getAuthUserId(ctx);
    if (!d || d.userId !== uid) return { status: "gone" as const };
    await editBoard(ctx, d.boardId);
    const o = await ctx.db.get(d.objectId);
    if (!o) { await ctx.db.delete(id); return { status: "gone" as const }; }
    if (heldByOther(o, uid)) return { status: "locked" as const, by: o.lockedName ?? "Someone" };
    await ctx.db.patch(o._id, { ...cleanPatch(JSON.parse(d.patch)), updatedAt: Date.now() });
    await ctx.db.delete(id);
    return { status: "ok" as const };
  },
});
export const remove = mutation({
  args: { id: v.id("wb_drafts") },
  handler: async (ctx, { id }) => {
    const d = await ctx.db.get(id);
    if (!d) return;
    const b = await ctx.db.get(d.boardId);
    if (d.userId === (await getAuthUserId(ctx)) || (await roleOf(ctx, b)) === "owner") await ctx.db.delete(id);
  },
});
