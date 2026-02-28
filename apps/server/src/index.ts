import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware, type AuthVariables } from "./middleware/auth";
import { chatRouter } from "./modules/chat/chat.router";
import { desktopAuthRouter } from "./modules/auth/desktop-auth.router";
import { desktopLoginPage } from "./modules/auth/desktop-login.page";

const allowedWebOrigins = process.env.NODE_ENV === "development"
  ? ["http://localhost:3000", "http://localhost:5173"]
  : [process.env.WEB_URL || ""];

const app = new Hono<{ Variables: AuthVariables }>()
  .use("*", cors({
    origin: (origin) => {
      if (allowedWebOrigins.includes(origin)) return origin;
      if (origin?.startsWith("http://localhost:") || origin === "null") return origin;
      return allowedWebOrigins[0] || null;
    },
    allowHeaders: ["Content-Type", "Authorization", "x-desktop"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: true,
  }))
  .use("*", authMiddleware)
  .use("/api/auth/*", (c, next) => {
    // Check if request is from desktop app (via user agent or explicit header)
    const userAgent = c.req.header("user-agent") || "";
    if (userAgent.includes("dbdesk") || c.req.header("x-desktop")) {
      // x-desktop header already set by client, just continue
    } else {
      // For browser-based requests, ensure x-desktop is not set (allowing cookies)
    }
    return next();
  })
  // Desktop auth endpoints MUST be registered before the better-auth catch-all
  .route("/api/auth/desktop", desktopAuthRouter)
  .on(["POST", "GET"], "/api/auth/*", (c) => {
    // Skip paths handled by desktopAuthRouter so they don't fall through to better-auth
    const path = new URL(c.req.url).pathname;
    if (path.startsWith("/api/auth/desktop/")) {
      return c.notFound();
    }
    return auth.handler(c.req.raw);
  })
  // Desktop login page — serves the HTML form for the PKCE auth flow
  .get("/auth/desktop", (c) => {
    const codeChallenge = c.req.query("code_challenge");
    if (!codeChallenge) {
      return c.text("Missing code_challenge parameter", 400);
    }
    return c.html(desktopLoginPage(codeChallenge));
  });

// ---------- Typed API routes (contribute to AppType) ----------

const routes = app
  .get("/", (c) => {
    return c.json({
      message: "Welcome to DBDesk API",
      endpoints: { chat: "/api/chat", auth: "/api/auth/*", session: "/api/session" },
    });
  })
  .get("/api/session", (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!user) return c.json({ error: "Unauthorized" as const }, 401);

    return c.json({ session, user });
  })
  .route("/api/chat", chatRouter);

export type AppType = typeof routes;

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
