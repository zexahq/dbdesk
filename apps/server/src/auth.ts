import "dotenv/config";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";
import { db } from "./db/index";
import * as schema from "./db/schema";

// ===== CUSTOM PLUGIN: Prevent cookies for desktop clients =====
// Desktop clients send 'x-desktop: true' header
// This ensures they only receive bearer tokens, not cookies
function noSetCookiePlugin() {
  return {
    id: "no-set-cookie",
    hooks: {
      after: [
        {
          matcher: (ctx) => !!ctx.request?.headers.get("x-desktop"),
          handler: createAuthMiddleware(async (ctx) => {
            const headers = ctx.context.responseHeaders;

            if (headers instanceof Headers) {
              const setCookies = headers.get("set-cookie");

              if (!setCookies) return;

              headers.delete("set-cookie");
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}

export const auth = betterAuth({
  appName: "DBDesk",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [bearer(), noSetCookiePlugin()],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      enabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      enabled: !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.API_URL,
  basePath: "/api/auth",
  trustedOrigins: [
    process.env.WEB_URL || "http://localhost:3000",
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://localhost:3000"]
      : []),
  ],
});
