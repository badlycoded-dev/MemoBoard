import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
const style = v.object({ stroke: v.string(), fill: v.string(), sw: v.number(), fs: v.number(), bold: v.boolean(), tc: v.string() });
export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const rows = await ctx.db.query("wb_objects").withIndex("by_board", (q) => q.eq("boardId", boardId)).collect();
    return Promise.all(rows.map(async (r) => ({ ...r, fileUrl: r.file ? await ctx.storage.getUrl(r.file.storageId) : null })));
  },
});
export const add = mutation({
  args: { boardId: v.id("boards"), kind: v.string(), x: v.number(), y: v.number(), w: v.number(), h: v.number(), style,
    text: v.optional(v.string()), code: v.optional(v.string()), fromId: v.optional(v.string()), toId: v.optional(v.string()),
    file: v.optional(v.object({ storageId: v.id("_storage"), name: v.string() })) },
  handler: (ctx, a) => ctx.db.insert("wb_objects", a),
});
export const patch = mutation({ args: { id: v.id("wb_objects"), patch: v.any() }, handler: (ctx, { id, patch }) => ctx.db.patch(id, patch) });
export const remove = mutation({ args: { id: v.id("wb_objects") }, handler: (ctx, { id }) => ctx.db.delete(id) });
export const uploadUrl = mutation({ args: {}, handler: (ctx) => ctx.storage.generateUploadUrl() });
