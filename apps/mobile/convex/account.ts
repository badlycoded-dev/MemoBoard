import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthSessionId, getAuthUserId, invalidateSessions, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";

export const emailOf = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => (await ctx.db.get(id))?.email ?? null,
});

// Verifies the current password, sets the new one, and signs out every other session.
export const changePassword = action({
  args: { current: v.string(), next: v.string() },
  handler: async (ctx, { current, next }) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) throw new Error("Not signed in");
    if (next.length < 8) throw new Error("New password must be at least 8 characters");
    const email = await ctx.runQuery(internal.account.emailOf, { id: uid });
    if (!email) throw new Error("This account has no password");
    try {
      await retrieveAccount(ctx, { provider: "password", account: { id: email, secret: current } });
    } catch {
      throw new Error("Current password is wrong, or this account signs in with Google");
    }
    await modifyAccountCredentials(ctx, { provider: "password", account: { id: email, secret: next } });
    const sid = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, { userId: uid, except: sid ? [sid] : [] });
  },
});
