import "server-only";
import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | undefined;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3,
      idleTimeoutMillis: 5000, connectionTimeoutMillis: 10000,
      application_name: "enemites-analytics" });
    pool.on("error", () => console.error("Analytics database connection error"));
    attachDatabasePool(pool);
  }
  return pool;
}
export async function readDatabase<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout = '10000'");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
