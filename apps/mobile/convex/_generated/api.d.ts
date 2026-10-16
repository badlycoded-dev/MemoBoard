/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as boards from "../boards.js";
import type * as drafts from "../drafts.js";
import type * as http from "../http.js";
import type * as kanban from "../kanban.js";
import type * as members from "../members.js";
import type * as objects from "../objects.js";
import type * as presence from "../presence.js";
import type * as strokes from "../strokes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  account: typeof account;
  auth: typeof auth;
  boards: typeof boards;
  drafts: typeof drafts;
  http: typeof http;
  kanban: typeof kanban;
  members: typeof members;
  objects: typeof objects;
  presence: typeof presence;
  strokes: typeof strokes;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
