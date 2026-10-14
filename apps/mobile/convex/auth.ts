import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";

// Google needs: npx convex env set AUTH_GOOGLE_ID ... / AUTH_GOOGLE_SECRET ...
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    Password({
      profile(params) {
        return { email: String(params.email).trim().toLowerCase(), name: String(params.name ?? "") || String(params.email).split("@")[0] };
      },
    }),
  ],
  callbacks: {
    // Allow the app's deep link (memoboard://) and local web dev origins as OAuth return targets.
    async redirect({ redirectTo }) {
      const site = process.env.SITE_URL ?? "";
      if (redirectTo.startsWith("memoboard://") || redirectTo.startsWith("exp://") || redirectTo.startsWith("http://localhost") || (site && redirectTo.startsWith(site))) return redirectTo;
      return site;
    },
  },
});
