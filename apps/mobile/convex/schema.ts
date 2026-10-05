import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  boards: defineTable({
    publicId: v.string(),
    type: v.union(v.literal("task"), v.literal("whiteboard")),
    name: v.string(), ownerId: v.string(),
    access: v.number(), // 0 admin,1 suspended,2 private,3 link,4 public
    createdAt: v.number(),
  }).index("by_public", ["publicId"]),
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
    style: v.object({ stroke: v.string(), fill: v.string(), sw: v.number(), fs: v.number(), bold: v.boolean(), tc: v.string() }),
    text: v.optional(v.string()), code: v.optional(v.string()),
    fromId: v.optional(v.string()), toId: v.optional(v.string()), // arrow links
    file: v.optional(v.object({ storageId: v.id("_storage"), name: v.string() })),
  }).index("by_board", ["boardId"]),
});
