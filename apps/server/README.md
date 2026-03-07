## Local development (Hono + Better Auth + Drizzle)

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `API_URL`, `WEB_URL`, and optionally `PORT`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
2. Create the DB and run migrations:
   ```bash
   pnpm db:generate   # generate migration from schema
   pnpm db:migrate   # apply to Postgres
   ```
3. Start the server:
   ```bash
   pnpm dev
   ```
4. Auth: `POST/GET /api/auth/*`. Session: `GET /api/session` (returns 401 if not signed in). Chat: `POST /api/chat`.

---

Prerequisites:

- [Vercel CLI](https://vercel.com/docs/cli) installed globally

To develop locally:

```
npm install
vc dev
```

```
open http://localhost:3000
```

To build locally:

```
npm install
vc build
```

To deploy:

```
npm install
vc deploy
```
