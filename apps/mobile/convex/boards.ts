import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({ args: {}, handler: (ctx) => ctx.db.query("boards").order("desc").collect() });
export const byPublicId = query({
  args: { publicId: v.string() },
  handler: (ctx, { publicId }) =>
    ctx.db.query("boards").withIndex("by_public", (q) => q.eq("publicId", publicId)).unique(),
});
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const publicId = Math.random().toString(36).slice(2, 10);
    await ctx.db.insert("boards", { publicId, type: "whiteboard", name, ownerId: "dev", access: 2, createdAt: Date.now() });
    return publicId;
  },
});
