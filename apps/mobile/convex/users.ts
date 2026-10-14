import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    return id ? await ctx.db.get(id) : null;
  },
});
export const update = mutation({
  args: { name: v.optional(v.string()), image: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const id = await getAuthUserId(ctx);
    if (!id) throw new Error("Not signed in");
    const patch: any = {};
    if (a.name !== undefined) patch.name = a.name;
    if (a.image !== undefined) patch.image = a.image || undefined;
    await ctx.db.patch(id, patch);
  },
});
