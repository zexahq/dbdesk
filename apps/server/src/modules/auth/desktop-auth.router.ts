import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import crypto from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "../../db/index"
import * as schema from "../../db/schema"
import type { AuthVariables } from "../../middleware/auth"

// ── In-memory auth code store ──
// Short-lived codes (5 min TTL) for desktop PKCE exchange.
// In production with multiple server instances, use Redis instead.

interface PendingCode {
  code: string
  codeChallenge: string
  userId: string
  createdAt: number
}

const CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const pendingCodes = new Map<string, PendingCode>()

// Periodically clean expired codes
setInterval(() => {
  const now = Date.now()
  for (const [code, entry] of pendingCodes) {
    if (now - entry.createdAt > CODE_TTL_MS) {
      pendingCodes.delete(code)
    }
  }
}, 60_000)

// ── Schemas ──

const createCodeSchema = z.object({
  codeChallenge: z.string().min(1, "code_challenge is required"),
})

const exchangeSchema = z.object({
  code: z.string().min(1, "code is required"),
  codeVerifier: z.string().min(1, "code_verifier is required"),
})

// ── Router ──

export const desktopAuthRouter = new Hono<{ Variables: AuthVariables }>()
  /**
   * POST /create-code
   *
   * Called by the web app after the user logs in.
   * Requires an authenticated session (cookie-based from web login).
   * Creates a one-time auth code tied to the PKCE code_challenge.
   */
  .post("/create-code", zValidator("json", createCodeSchema), async (c) => {
    const user = c.get("user")
    if (!user) {
      return c.json({ error: "Unauthorized" as const }, 401)
    }

    const { codeChallenge } = c.req.valid("json")
    const code = crypto.randomBytes(32).toString("base64url")

    pendingCodes.set(code, {
      code,
      codeChallenge,
      userId: user.id,
      createdAt: Date.now(),
    })

    return c.json({ code })
  })

  /**
   * POST /exchange
   *
   * Called by the desktop app after receiving the auth code via deep link.
   * Validates PKCE: SHA-256(code_verifier) must equal the stored code_challenge.
   * On success, creates a new bearer session and returns the token.
   */
  .post("/exchange", zValidator("json", exchangeSchema), async (c) => {
    const { code, codeVerifier } = c.req.valid("json")

    const pending = pendingCodes.get(code)
    if (!pending) {
      return c.json({ error: "Invalid or expired code" as const }, 400)
    }

    // Check expiry
    if (Date.now() - pending.createdAt > CODE_TTL_MS) {
      pendingCodes.delete(code)
      return c.json({ error: "Code expired" as const }, 400)
    }

    // PKCE verification: SHA-256(code_verifier) must match code_challenge
    const computedChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url")

    if (computedChallenge !== pending.codeChallenge) {
      pendingCodes.delete(code)
      return c.json({ error: "PKCE verification failed" as const }, 400)
    }

    // Code is valid — consume it (one-time use)
    pendingCodes.delete(code)

    // Create a new bearer session for the desktop app directly in the DB.
    // This mirrors how better-auth stores sessions so the middleware can
    // validate it via `auth.api.getSession()`.
    const sessionId = crypto.randomUUID()
    const token = crypto.randomBytes(32).toString("base64url")
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    try {
      await db.insert(schema.session).values({
        id: sessionId,
        token,
        userId: pending.userId,
        expiresAt,
        createdAt: now,
        updatedAt: now,
        userAgent: "dbdesk-desktop",
      })

      // Fetch user info to return alongside the token
      const [user] = await db
        .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, image: schema.user.image })
        .from(schema.user)
        .where(eq(schema.user.id, pending.userId))
        .limit(1)

      return c.json({
        token,
        user: user ?? null,
      })
    } catch (error) {
      console.error("[desktop-auth:exchange] Failed to create session:", error)
      return c.json({ error: "Failed to create session" as const }, 500)
    }
  })
