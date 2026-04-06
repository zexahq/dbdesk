## Local development

This workspace is part of a `pnpm` monorepo. Run commands from the repo root unless noted.

1. Copy `apps/server/.env.example` to `apps/server/.env`.
2. Set these required variables:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `API_URL`
   - `WEB_URL`
3. Set optional variables if needed:
   - `PORT`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
4. Run the database setup from `apps/server/`:

```bash
pnpm run db:generate
pnpm run db:migrate
```

5. Start the server from the repo root:

```bash
pnpm run dev:server
```

Auth lives at `POST/GET /api/auth/*`. Session is `GET /api/session`. Chat is `POST /api/chat`.

## Vercel deployment

No major server code changes are required for Vercel. The server already default-exports the Hono app, and it only calls `serve()` when `VERCEL` is not set.

Recommended project settings:

1. Import the monorepo into Vercel.
2. Set the project Root Directory to `apps/server`.
3. Keep the package manager as `pnpm`.
4. Add the environment variables used by the server:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `API_URL`
   - `WEB_URL`
   - `GOOGLE_GENERATIVE_AI_API_KEY` if chat is enabled
   - social auth credentials if you use Google or GitHub login
5. Redeploy after changing env vars.

Notes:

- If `WEB_URL` points at your desktop auth/login web app, keep it updated to the deployed frontend URL.
- If you later import code from packages outside `apps/server`, you may need to deploy from the repo root instead of using `apps/server` as the Vercel root directory.
- Use `pnpm dlx vercel` or the Vercel dashboard. Do not use `npm` here.
