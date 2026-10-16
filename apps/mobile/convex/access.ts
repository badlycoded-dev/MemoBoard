import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

type Ctx = QueryCtx | MutationCtx;
// boards.access: 0 admin, 1 suspended, 2 private, 3 link, 4 public

/** Owner always; everyone else only when the board is link-shared or public. */
export async function canView(ctx: Ctx, b: Doc<"boards"> | null): Promise<boolean> {
  if (!b) return false;
  const uid = await getAuthUserId(ctx);
  return (!!uid && b.ownerId === uid) || b.access >= 3;
}
/** Signed-in owner, or signed-in user on a link-shared/public board. Suspended boards are read-only. */
export async function canEdit(ctx: Ctx, b: Doc<"boards"> | null): Promise<boolean> {
  if (!b || b.access === 1) return false;
  const uid = await getAuthUserId(ctx);
  return !!uid && (b.ownerId === uid || b.access >= 3);
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
