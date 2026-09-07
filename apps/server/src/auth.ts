import 'dotenv/config'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth'
import { electron } from '@better-auth/electron'
import { bearer } from 'better-auth/plugins'
import { db } from './db/index.js'
import * as schema from './db/schema.js'

export const auth = betterAuth({
  appName: 'DBDesk',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  plugins: [bearer(), electron()],
  session: {
    expiresIn: 60 * 60 * 24 * 365, // 1 year
    updateAge: 60 * 60 * 24 * 30,  // refresh after 30 days of inactivity
  },
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
  basePath: '/api/auth',
  trustedOrigins: [
    process.env.WEB_URL || 'http://localhost:3001',
    'dbdesk:/',
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://localhost:3000"]
      : []),
  ],
  advanced: {
    crossSubDomainCookies: process.env.COOKIE_DOMAIN
      ? { enabled: true, domain: process.env.COOKIE_DOMAIN }
      : undefined,
  },
})
