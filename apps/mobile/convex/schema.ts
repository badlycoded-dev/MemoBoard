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
    color: v.string(), width: v.number(),
    points: v.array(v.number()), // flat [x,y,x,y...]
    createdAt: v.number(),
  }).index("by_board", ["boardId"]),
});
