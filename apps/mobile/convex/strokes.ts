import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
const byBoard = (ctx: any, boardId: any) =>
  ctx.db.query("wb_strokes").withIndex("by_board", (q: any) => q.eq("boardId", boardId));
export const list = query({ args: { boardId: v.id("boards") }, handler: (ctx, { boardId }) => byBoard(ctx, boardId).collect() });
export const add = mutation({
  args: { boardId: v.id("boards"), tool: v.optional(v.string()), color: v.string(), width: v.number(), points: v.array(v.number()) },
  handler: (ctx, a) => ctx.db.insert("wb_strokes", { ...a, userId: "dev", createdAt: Date.now() }),
});
export const undo = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const s = await byBoard(ctx, boardId).order("desc").first();
    if (s) await ctx.db.delete(s._id);
  },
});
export const clear = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => { for (const s of await byBoard(ctx, boardId).collect()) await ctx.db.delete(s._id); },
});
export const remove = mutation({ args: { id: v.id("wb_strokes") }, handler: (ctx, { id }) => ctx.db.delete(id) });
