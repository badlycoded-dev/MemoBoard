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

// Deletes the account. Owned boards are not purged: they become suspended (access 1) and are kept
// for the retention period. Memberships, invites and all sign-in data are removed.
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) throw new Error("Not signed in");
    for (const b of await ctx.db.query("boards").withIndex("by_owner", (q) => q.eq("ownerId", uid)).take(500)) await ctx.db.patch(b._id, { access: 1 });
    for (const m of await ctx.db.query("board_members").withIndex("by_user", (q) => q.eq("userId", uid)).take(500)) await ctx.db.delete(m._id);
    for (const i of await ctx.db.query("board_invites").withIndex("by_user", (q) => q.eq("toUserId", uid)).take(500)) await ctx.db.delete(i._id);
    for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", uid)).collect()) {
      for (const t of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).collect()) await ctx.db.delete(t._id);
      await ctx.db.delete(s._id);
    }
    for (const a of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", uid)).collect()) {
      for (const c of await ctx.db.query("authVerificationCodes").withIndex("accountId", (q) => q.eq("accountId", a._id)).collect()) await ctx.db.delete(c._id);
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(uid);
  },
});
