# DBDesk Website

Official website and documentation for [DBDesk](https://github.com/zexahq/dbdesk) — a modern desktop application for managing PostgreSQL databases.

## Development

**Start the development server:**

```bash
pnpm dev
```

Opens on `http://localhost:3001`.

## Structure

| Directory              | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `src/app/(home)`       | Landing page and marketing pages                          |
| `src/app/(auth)`       | Authentication pages (login, signup)                      |
| `src/app/docs`         | Documentation layout and pages (using Fumadocs)           |
| `src/app/api`          | API routes (search, auth callbacks)                       |
| `src/components`       | Reusable React components                                 |
| `src/lib`              | Utilities, Fumadocs source configuration                  |
| `content/docs`         | Documentation MDX files                                   |
| `public`               | Static assets                                             |
| `src/app/global.css`   | Tailwind CSS styles                                       |

## Key Features

- **Next.js 16** — React framework with App Router
- **Fumadocs** — MDX-based documentation with built-in search
- **Better Auth** — Authentication with email/password and OAuth
- **Tailwind CSS** — Styling
- **TypeScript** — Type-safe development
- **Responsive Design** — Mobile-friendly UI

## Building

```bash
pnpm build
pnpm start
```

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WEB_URL=http://localhost:3001
```

See `.env.example` for available options.

## Documentation

Documentation files are in `content/docs/` as MDX. The site is configured via:

- `source.config.ts` — Fumadocs metadata & schema
- `lib/source.ts` — Content loader configuration
- `src/lib/layout.shared.tsx` — Shared layout options

For more on Fumadocs, see [fumadocs.dev](https://fumadocs.dev)
