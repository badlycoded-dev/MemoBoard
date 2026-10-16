import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

type Ctx = QueryCtx | MutationCtx;
// boards.access: 0 admin, 1 suspended, 2 private, 3 link, 4 public

export type Role = "owner" | "editor" | "viewer";
export async function roleOf(ctx: Ctx, b: Doc<"boards"> | null): Promise<Role | null> {
  const uid = await getAuthUserId(ctx);
  if (!b || !uid) return null;
  if (b.ownerId === uid) return "owner";
  const m = await ctx.db.query("board_members").withIndex("by_board_user", (q) => q.eq("boardId", b._id).eq("userId", uid)).unique();
  return m?.role ?? null;
}
/** Owner or member always; everyone else only when the board is link-shared or public. */
export async function canView(ctx: Ctx, b: Doc<"boards"> | null): Promise<boolean> {
  return !!b && ((await roleOf(ctx, b)) !== null || b.access >= 3);
}
/** Owner or editor. Viewers and non-members are read-only; suspended boards are read-only for all. */
export async function canEdit(ctx: Ctx, b: Doc<"boards"> | null): Promise<boolean> {
  if (!b || b.access === 1) return false;
  const r = await roleOf(ctx, b);
  return r === "owner" || r === "editor";
}
export const LOCK_MS = 45_000; // a lock not refreshed for this long is considered abandoned
export const heldByOther = (o: { lockedBy?: string; lockedAt?: number }, uid: string) =>
  !!o.lockedBy && o.lockedBy !== uid && Date.now() - (o.lockedAt ?? 0) < LOCK_MS;
export async function userName(ctx: Ctx, uid: string): Promise<string> {
  const u: any = await ctx.db.get(uid as Id<"users">);
  return u?.name ?? u?.email ?? "Someone";
}
export async function viewBoard(ctx: Ctx, id: Id<"boards">) {
  const b = await ctx.db.get(id);
  return (await canView(ctx, b)) ? b : null;
}
export async function editBoard(ctx: MutationCtx, id: Id<"boards">) {
  const b = await ctx.db.get(id);
  if (!b || !(await canEdit(ctx, b))) throw new Error("Not allowed");
  return b;
}
export const noPage = { page: [], isDone: true, continueCursor: "" };
/** Maps null (cleared) to undefined and drops undefined keys, for ctx.db.patch. */
export const cleanPatch = (p: Record<string, any>) => {
  const o: Record<string, any> = {};
  for (const [k, val] of Object.entries(p)) if (val !== undefined) o[k] = val === null ? undefined : val;
  return o;
};
