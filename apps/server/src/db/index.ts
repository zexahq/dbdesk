import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

const pool = new Pool({ connectionString });

/**
 * Drizzle client with Postgres. Use this for app queries.
 * Better Auth uses the same instance via the Drizzle adapter.
 */
export const db = drizzle(pool, { schema });
