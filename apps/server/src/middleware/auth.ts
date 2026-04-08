import type { Context, Next } from "hono";
import { auth } from '../auth.js'

/**
 * Session type from Better Auth (user + session objects).
 * Used for Hono context variables.
 */
export type Session = typeof auth.$Infer.Session;

export type AuthVariables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

/**
 * Middleware that loads the current session and sets `user` and `session`
 * on the Hono context. Register before routes that need auth.
 */
export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
}
