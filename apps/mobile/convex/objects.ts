import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { cleanPatch, editBoard, heldByOther, noPage, userName, viewBoard } from "./access";

const style = v.object({ stroke: v.string(), fill: v.string(), sw: v.number(), fs: v.number(), bold: v.boolean(), tc: v.string(), r: v.optional(v.number()), dash: v.optional(v.string()) });
// Optional; null means "clear this field".
const nul = (t: any) => v.optional(v.union(v.null(), t));

export const list = query({
  args: { boardId: v.id("boards"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { boardId, paginationOpts }) => {
    if (!(await viewBoard(ctx, boardId))) return noPage;
    const res = await ctx.db.query("wb_objects").withIndex("by_board", (q) => q.eq("boardId", boardId)).paginate(paginationOpts);
    return { ...res, page: await Promise.all(res.page.map(async (r) => ({ ...r, fileUrl: r.file ? await ctx.storage.getUrl(r.file.storageId) : null }))) };
  },
});
export const add = mutation({
  args: { boardId: v.id("boards"), kind: v.string(), x: v.number(), y: v.number(), w: v.number(), h: v.number(), style,
    text: v.optional(v.string()), code: v.optional(v.string()), hidden: v.optional(v.boolean()), showContent: v.optional(v.boolean()), url: v.optional(v.string()),
    rot: v.optional(v.number()), flipX: v.optional(v.boolean()), flipY: v.optional(v.boolean()), fromId: v.optional(v.string()), toId: v.optional(v.string()),
    file: v.optional(v.object({ storageId: v.id("_storage"), name: v.string() })) },
  handler: async (ctx, a) => {
    await editBoard(ctx, a.boardId);
    return ctx.db.insert("wb_objects", { ...a, updatedAt: Date.now() });
  },
});
// Only these fields can change. boardId, kind and file are immutable.
// Only these fields can change. boardId, kind and file are immutable.
// `base` is the updatedAt the client saw when it made the edit. If the object changed since,
// the edit is saved as a draft (max 5 per whiteboard) instead of overwriting the other change.
export const patch = mutation({
  args: {
    id: v.id("wb_objects"),
    base: v.optional(v.number()),
    patch: v.object({
      x: v.optional(v.number()), y: v.optional(v.number()), w: v.optional(v.number()), h: v.optional(v.number()), style: v.optional(style),
      text: nul(v.string()), code: nul(v.string()), url: nul(v.string()), hidden: nul(v.boolean()), showContent: nul(v.boolean()),
      rot: nul(v.number()), flipX: nul(v.boolean()), flipY: nul(v.boolean()), fromId: nul(v.string()), toId: nul(v.string()),
    }),
  },
  handler: async (ctx, { id, patch, base }) => {
    const o = await ctx.db.get(id);
    if (!o) return { status: "gone" as const };
    await editBoard(ctx, o.boardId);
    const uid = (await getAuthUserId(ctx))!;
    if (heldByOther(o, uid)) return { status: "locked" as const, by: o.lockedName ?? "Someone" };
    if (o.updatedAt !== undefined && base !== o.updatedAt) {
      const n = (await ctx.db.query("wb_drafts").withIndex("by_board", (q) => q.eq("boardId", o.boardId)).take(5)).length;
      if (n >= 5) return { status: "draft_full" as const };
      await ctx.db.insert("wb_drafts", { boardId: o.boardId, userId: uid, objectId: id, patch: JSON.stringify(patch), baseUpdatedAt: base, createdAt: Date.now() });
      return { status: "draft" as const };
    }
    const updatedAt = Date.now();
    await ctx.db.patch(id, { ...cleanPatch(patch), updatedAt });
    return { status: "ok" as const, updatedAt };
  },
});
// Editing lock: taken when an item is selected, refreshed by a heartbeat, released on deselect.
export const lock = mutation({
  args: { id: v.id("wb_objects") },
  handler: async (ctx, { id }) => {
    const o = await ctx.db.get(id);
    if (!o) return { ok: false as const };
    await editBoard(ctx, o.boardId);
    const uid = (await getAuthUserId(ctx))!;
    if (heldByOther(o, uid)) return { ok: false as const, by: o.lockedName ?? "Someone" };
    await ctx.db.patch(id, { lockedBy: uid, lockedName: await userName(ctx, uid), lockedAt: Date.now() });
    return { ok: true as const };
  },
});
export const unlock = mutation({
  args: { id: v.id("wb_objects") },
  handler: async (ctx, { id }) => {
    const o = await ctx.db.get(id);
    if (o && o.lockedBy && o.lockedBy === (await getAuthUserId(ctx))) await ctx.db.patch(id, { lockedBy: undefined, lockedName: undefined, lockedAt: undefined });
  },
});
export const remove = mutation({
  args: { id: v.id("wb_objects") },
  handler: async (ctx, { id }) => {
    const o = await ctx.db.get(id);
    if (!o) return;
    await editBoard(ctx, o.boardId);
    if (o.file) await ctx.storage.delete(o.file.storageId).catch(() => {});
    await ctx.db.delete(id);
  },
});
export const uploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await getAuthUserId(ctx))) throw new Error("Not allowed");
    return ctx.storage.generateUploadUrl();
  },
});
