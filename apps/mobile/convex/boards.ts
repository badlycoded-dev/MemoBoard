import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({ args: {}, handler: (ctx) => ctx.db.query("boards").order("desc").collect() });
export const byPublicId = query({
  args: { publicId: v.string() },
  handler: (ctx, { publicId }) =>
    ctx.db.query("boards").withIndex("by_public", (q) => q.eq("publicId", publicId)).unique(),
});
export const create = mutation({
  args: {
    name: v.string(),
    type: v.optional(v.union(v.literal("task"), v.literal("whiteboard"))),
    mode: v.optional(v.union(v.literal("progress"), v.literal("multi"))),
    columns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { name, type, mode, columns }) => {
    const publicId = Math.random().toString(36).slice(2, 10);
    const boardId = await ctx.db.insert("boards", {
      publicId, type: type ?? "whiteboard", name, ownerId: "dev", access: 2, createdAt: Date.now(),
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
  handler: (ctx, { id, style }) => ctx.db.patch(id, { style }),
});
export const rename = mutation({
  args: { id: v.id("boards"), name: v.string() },
  handler: (ctx, { id, name }) => ctx.db.patch(id, { name }),
});
