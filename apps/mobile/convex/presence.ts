import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { userName, viewBoard } from "./access";

// Heartbeat every ~10s from each open board. Clients ignore rows older than 30s.
export const beat = mutation({
  args: { boardId: v.id("boards"), editing: v.optional(v.string()) },
  handler: async (ctx, { boardId, editing }) => {
    const uid = await getAuthUserId(ctx);
    if (!uid || !(await viewBoard(ctx, boardId))) return;
    const row = await ctx.db.query("presence").withIndex("by_board_user", (q) => q.eq("boardId", boardId).eq("userId", uid)).unique();
    const now = Date.now();
    const u: any = await ctx.db.get(uid as any);
    const image = u?.image ?? undefined;
    if (row) await ctx.db.patch(row._id, { editing, image, seenAt: now });
    else await ctx.db.insert("presence", { boardId, userId: uid, name: await userName(ctx, uid), image, editing, seenAt: now });
    // opportunistic cleanup of long-gone rows
    const old = await ctx.db.query("presence").withIndex("by_board", (q) => q.eq("boardId", boardId)).take(50);
    for (const r of old) if (now - r.seenAt > 5 * 60_000) await ctx.db.delete(r._id);
  },
});
export const leave = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) return;
    const row = await ctx.db.query("presence").withIndex("by_board_user", (q) => q.eq("boardId", boardId).eq("userId", uid)).unique();
    if (row) await ctx.db.delete(row._id);
  },
});
export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) =>
    (await viewBoard(ctx, boardId)) ? ctx.db.query("presence").withIndex("by_board", (q) => q.eq("boardId", boardId)).take(50) : [],
});
