import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { roleOf, viewBoard } from "./access";

const roleV = v.union(v.literal("editor"), v.literal("viewer"));
const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const ownerOnly = async (ctx: any, boardId: any) => {
  const b = await ctx.db.get(boardId);
  if ((await roleOf(ctx, b)) !== "owner") throw new Error("Only the owner can do this");
  return b;
};

export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    const b = await viewBoard(ctx, boardId);
    if (!b) return [];
    const ms = await ctx.db.query("board_members").withIndex("by_board", (q) => q.eq("boardId", boardId)).take(200);
    const who = async (id: string, role: string) => {
      const u: any = await ctx.db.get(id as any);
      return { userId: id, role, name: u?.name ?? u?.email ?? "Unknown", image: u?.image ?? null };
    };
    return [await who(b.ownerId, "owner"), ...(await Promise.all(ms.map((m) => who(m.userId, m.role))))];
  },
});
export const setRole = mutation({
  args: { boardId: v.id("boards"), userId: v.string(), role: roleV },
  handler: async (ctx, { boardId, userId, role }) => {
    await ownerOnly(ctx, boardId);
    const m = await ctx.db.query("board_members").withIndex("by_board_user", (q) => q.eq("boardId", boardId).eq("userId", userId)).unique();
    if (m) await ctx.db.patch(m._id, { role });
  },
});
// Owner removes anyone; a member can remove themselves (leave).
export const remove = mutation({
  args: { boardId: v.id("boards"), userId: v.string() },
  handler: async (ctx, { boardId, userId }) => {
    const me = await getAuthUserId(ctx);
    if (me !== userId) await ownerOnly(ctx, boardId);
    const m = await ctx.db.query("board_members").withIndex("by_board_user", (q) => q.eq("boardId", boardId).eq("userId", userId)).unique();
    if (m) await ctx.db.delete(m._id);
  },
});

// Invite links: the token is shown once; only its hash is stored.
export const createInvite = mutation({
  args: { boardId: v.id("boards"), role: roleV, expiresInHours: v.optional(v.number()), maxUses: v.optional(v.number()) },
  handler: async (ctx, { boardId, role, expiresInHours, maxUses }) => {
    await ownerOnly(ctx, boardId);
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.db.insert("invite_links", {
      boardId, role, tokenHash: await sha256(token), createdBy: (await getAuthUserId(ctx))!, uses: 0, revoked: false, createdAt: Date.now(),
      ...(expiresInHours ? { expiresAt: Date.now() + expiresInHours * 3_600_000 } : {}), ...(maxUses ? { maxUses } : {}),
    });
    return token;
  },
});
export const invites = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    if ((await roleOf(ctx, await ctx.db.get(boardId))) !== "owner") return [];
    return (await ctx.db.query("invite_links").withIndex("by_board", (q) => q.eq("boardId", boardId)).take(50))
      .filter((i) => !i.revoked).map(({ tokenHash, ...i }) => i);
  },
});
export const revokeInvite = mutation({
  args: { id: v.id("invite_links") },
  handler: async (ctx, { id }) => {
    const i = await ctx.db.get(id);
    if (!i) return;
    await ownerOnly(ctx, i.boardId);
    await ctx.db.patch(id, { revoked: true });
  },
});
export const join = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) throw new Error("Not signed in");
    const tokenHash = await sha256(token);
    const inv = await ctx.db.query("invite_links").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).unique();
    if (!inv || inv.revoked || (inv.expiresAt && inv.expiresAt < Date.now()) || (inv.maxUses && inv.uses >= inv.maxUses)) throw new Error("This invite link is invalid or expired");
    const b = await ctx.db.get(inv.boardId);
    if (!b || b.access === 1) throw new Error("This board is no longer available");
    if ((await roleOf(ctx, b)) === null) {
      await ctx.db.insert("board_members", { boardId: b._id, userId: uid, role: inv.role, joinedAt: Date.now() });
      await ctx.db.patch(inv._id, { uses: inv.uses + 1 });
    }
    return { publicId: b.publicId, type: b.type };
  },
});

// ---- invite a specific person ----
// Exact email match only, so the user list can't be browsed.
export const findUser = query({
  args: { boardId: v.id("boards"), email: v.string() },
  handler: async (ctx, { boardId, email }) => {
    const b = await ctx.db.get(boardId);
    if ((await roleOf(ctx, b)) !== "owner") return null;
    const u: any = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email.trim().toLowerCase())).first();
    if (!u || u._id === b!.ownerId) return null;
    return { userId: u._id as string, name: u.name ?? u.email, image: u.image ?? null };
  },
});
export const inviteUser = mutation({
  args: { boardId: v.id("boards"), userId: v.string(), role: roleV },
  handler: async (ctx, { boardId, userId, role }) => {
    const b = await ownerOnly(ctx, boardId);
    if (userId === b.ownerId) throw new Error("That is the owner");
    const member = await ctx.db.query("board_members").withIndex("by_board_user", (q) => q.eq("boardId", boardId).eq("userId", userId)).unique();
    if (member) throw new Error("Already a member");
    const dup = (await ctx.db.query("board_invites").withIndex("by_user", (q) => q.eq("toUserId", userId)).take(100)).find((i) => i.boardId === boardId);
    if (dup) await ctx.db.patch(dup._id, { role });
    else await ctx.db.insert("board_invites", { boardId, toUserId: userId, role, invitedBy: (await getAuthUserId(ctx))!, createdAt: Date.now() });
  },
});
export const boardInvites = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, { boardId }) => {
    if ((await roleOf(ctx, await ctx.db.get(boardId))) !== "owner") return [];
    const rows = await ctx.db.query("board_invites").withIndex("by_board", (q) => q.eq("boardId", boardId)).take(50);
    return Promise.all(rows.map(async (i) => { const u: any = await ctx.db.get(i.toUserId as any); return { _id: i._id, role: i.role, name: u?.name ?? u?.email ?? "Unknown" }; }));
  },
});
export const cancelInvite = mutation({
  args: { id: v.id("board_invites") },
  handler: async (ctx, { id }) => {
    const i = await ctx.db.get(id);
    if (!i) return;
    await ownerOnly(ctx, i.boardId);
    await ctx.db.delete(id);
  },
});
export const myInvites = query({
  args: {},
  handler: async (ctx) => {
    const uid = await getAuthUserId(ctx);
    if (!uid) return [];
    const rows = await ctx.db.query("board_invites").withIndex("by_user", (q) => q.eq("toUserId", uid)).take(50);
    const out = await Promise.all(rows.map(async (i) => {
      const b = await ctx.db.get(i.boardId);
      const from: any = await ctx.db.get(i.invitedBy as any);
      return b && b.access !== 1 ? { _id: i._id, board: b.name, type: b.type, role: i.role, from: from?.name ?? from?.email ?? "Someone" } : null;
    }));
    return out.filter((x) => x !== null);
  },
});
export const respond = mutation({
  args: { id: v.id("board_invites"), accept: v.boolean() },
  handler: async (ctx, { id, accept }) => {
    const uid = await getAuthUserId(ctx);
    const i = await ctx.db.get(id);
    if (!uid || !i || i.toUserId !== uid) throw new Error("Invite not found");
    await ctx.db.delete(id);
    if (!accept) return null;
    const b = await ctx.db.get(i.boardId);
    if (!b || b.access === 1) throw new Error("This board is no longer available");
    if ((await roleOf(ctx, b)) === null) await ctx.db.insert("board_members", { boardId: b._id, userId: uid, role: i.role, joinedAt: Date.now() });
    return { publicId: b.publicId, type: b.type };
  },
});
