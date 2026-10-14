import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
export default defineSchema({
  ...authTables,
  boards: defineTable({
    publicId: v.string(),
    type: v.union(v.literal("task"), v.literal("whiteboard")),
    name: v.string(), ownerId: v.string(),
    mode: v.optional(v.union(v.literal("progress"), v.literal("multi"))),
    style: v.optional(v.string()),
    showTrash: v.optional(v.boolean()),
    access: v.number(), // 0 admin,1 suspended,2 private,3 link,4 public
    createdAt: v.number(),
  }).index("by_public", ["publicId"]),
  tk_columns: defineTable({
    boardId: v.id("boards"), name: v.string(), order: v.number(),
    kind: v.string(), // todo | doing | done | custom
    color: v.optional(v.string()),
  }).index("by_board", ["boardId"]),
  tk_items: defineTable({
    boardId: v.id("boards"), columnId: v.id("tk_columns"),
    title: v.string(), description: v.optional(v.string()), content: v.optional(v.string()),
    importance: v.number(), // 0 low, 1 normal, 2 high, 3 critical
    status: v.string(), // open | claimed | done | trashed
    prevStatus: v.optional(v.string()),
    createdBy: v.string(), claimedBy: v.optional(v.string()),
    createdAt: v.number(), updatedAt: v.number(), completedAt: v.optional(v.number()),
    color: v.optional(v.string()), border: v.optional(v.number()), tint: v.optional(v.boolean()),
  }).index("by_board", ["boardId"]),
  tk_logs: defineTable({
    boardId: v.id("boards"), taskId: v.id("tk_items"),
    by: v.string(), action: v.string(), info: v.optional(v.string()), at: v.number(),
  }).index("by_task", ["taskId"]),
  wb_strokes: defineTable({
    boardId: v.id("boards"), userId: v.string(),
    tool: v.optional(v.string()), // "pen" | "wood"
    color: v.string(), width: v.number(),
    points: v.array(v.number()),
    createdAt: v.number(),
  }).index("by_board", ["boardId"]),
  wb_objects: defineTable({
    boardId: v.id("boards"), kind: v.string(), // rect|round|ellipse|triangle|arrow|arrowThick
    x: v.number(), y: v.number(), w: v.number(), h: v.number(), // arrows: start + delta
    style: v.object({ stroke: v.string(), fill: v.string(), sw: v.number(), fs: v.number(), bold: v.boolean(), tc: v.string(), r: v.optional(v.number()), dash: v.optional(v.string()) }),
    text: v.optional(v.string()), code: v.optional(v.string()), hidden: v.optional(v.boolean()), showContent: v.optional(v.boolean()), url: v.optional(v.string()),
    rot: v.optional(v.number()), flipX: v.optional(v.boolean()), flipY: v.optional(v.boolean()),
    fromId: v.optional(v.string()), toId: v.optional(v.string()), // arrow links
    file: v.optional(v.object({ storageId: v.id("_storage"), name: v.string() })),
  }).index("by_board", ["boardId"]),
});
