import { Pool } from "pg";

/**
 * Lazily-created connection pool — constructed on first call to getPool()
 * so that a missing DATABASE_URL only throws at call time, not at import time.
 * This keeps the module safe to import in unit tests that mock the pool.
 */
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing required env var: DATABASE_URL");

  _pool = new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return _pool;
}

/** Replace the pool instance — used in tests to inject a mock pool. */
export function _setPool(pool: Pool | null): void {
  _pool = pool;
}
