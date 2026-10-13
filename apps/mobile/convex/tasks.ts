import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
const status = v.union(v.literal("todo"), v.literal("doing"), v.literal("done"));
export const list = query({
  args: { boardId: v.id("boards") },
  handler: (ctx, { boardId }) => ctx.db.query("tasks").withIndex("by_board", (q) => q.eq("boardId", boardId)).collect(),
});
export const add = mutation({
  args: { boardId: v.id("boards"), text: v.string(), status },
  handler: (ctx, a) => ctx.db.insert("tasks", { ...a, createdAt: Date.now() }),
});
export const setStatus = mutation({ args: { id: v.id("tasks"), status }, handler: (ctx, { id, status }) => ctx.db.patch(id, { status }) });
export const remove = mutation({ args: { id: v.id("tasks") }, handler: (ctx, { id }) => ctx.db.delete(id) });
