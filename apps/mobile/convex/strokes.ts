import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { editBoard, noPage, viewBoard } from "./access";

const byBoard = (ctx: any, boardId: any) =>
  ctx.db.query("wb_strokes").withIndex("by_board", (q: any) => q.eq("boardId", boardId));

// Paginated: the client loads a board page by page instead of in one huge read.
export const list = query({
  args: { boardId: v.id("boards"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { boardId, paginationOpts }) =>
    (await viewBoard(ctx, boardId)) ? byBoard(ctx, boardId).paginate(paginationOpts) : noPage,
});
export const add = mutation({
  args: { boardId: v.id("boards"), tool: v.optional(v.string()), color: v.string(), width: v.number(), points: v.array(v.number()) },
  handler: async (ctx, a) => {
    await editBoard(ctx, a.boardId);
    const userId = (await getAuthUserId(ctx))!;
    return ctx.db.insert("wb_strokes", { ...a, userId, createdAt: Date.now() });
  },
});
// Undo removes the caller's own latest stroke, so collaborators don't erase each other.
export const undo = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    await editBoard(ctx, boardId);
    const userId = (await getAuthUserId(ctx))!;
    const s = await ctx.db.query("wb_strokes").withIndex("by_board_user", (q) => q.eq("boardId", boardId).eq("userId", userId)).order("desc").first();
    if (s) await ctx.db.delete(s._id);
  },
});
export const clear = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    await editBoard(ctx, boardId);
    await ctx.scheduler.runAfter(0, internal.strokes.clearBatch, { boardId });
  },
});
export const clearBatch = internalMutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const rows = await byBoard(ctx, boardId).take(200);
    for (const s of rows) await ctx.db.delete(s._id);
    if (rows.length === 200) await ctx.scheduler.runAfter(0, internal.strokes.clearBatch, { boardId });
  },
});
export const remove = mutation({
  args: { id: v.id("wb_strokes") },
  handler: async (ctx, { id }) => {
    const s = await ctx.db.get(id);
    if (!s) return;
    await editBoard(ctx, s.boardId);
    await ctx.db.delete(id);
  },
});
