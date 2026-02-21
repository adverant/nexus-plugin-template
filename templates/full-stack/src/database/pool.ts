import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

// ============================================================================
// PostgreSQL Connection Pool
// ============================================================================

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  // SSL configuration for production
  ...(process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('sslmode=require') && {
    ssl: { rejectUnauthorized: false },
  }),
};

export const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  console.error(JSON.stringify({
    level: 'error',
    msg: 'pool_error',
    error: err.message,
  }));
});

// ============================================================================
// Database Initialization
// ============================================================================

/**
 * Initialize the database by running pending migrations.
 * Migrations are SQL files in database/migrations/ sorted alphabetically.
 * Each migration runs inside a transaction and is tracked in a migrations table.
 */
export async function initDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Find migration files
    const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log(JSON.stringify({
        level: 'info',
        msg: 'migrations_skipped',
        reason: 'No migrations directory found',
      }));
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log(JSON.stringify({
        level: 'info',
        msg: 'migrations_skipped',
        reason: 'No migration files found',
      }));
      return;
    }

    // Get already-applied migrations
    const applied = await client.query('SELECT name FROM _migrations');
    const appliedSet = new Set(applied.rows.map(r => r.name));

    // Run pending migrations
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      console.log(JSON.stringify({
        level: 'info',
        msg: 'migration_running',
        file,
      }));

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');

        console.log(JSON.stringify({
          level: 'info',
          msg: 'migration_applied',
          file,
        }));
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(JSON.stringify({
          level: 'error',
          msg: 'migration_failed',
          file,
          error: err instanceof Error ? err.message : String(err),
        }));
        throw err;
      }
    }
  } finally {
    client.release();
  }
}
