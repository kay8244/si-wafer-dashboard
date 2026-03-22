// DB abstraction layer
// - POSTGRES_URL exists → @vercel/postgres (Vercel 배포용)
// - No POSTGRES_URL → better-sqlite3 (로컬/사내용)

import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'dashboard.db');

export interface MetricRow {
  id: number;
  tab: string;
  date: string;
  customer: string;
  category: string;
  value: number | null;
  unit: string | null;
  is_estimate: number;
  version: string | null;
  metadata: string | null;
}

export function getPostgresUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
}

export function isPostgres(): boolean {
  return !!getPostgresUrl();
}

// ── SQLite (local) ─────────────────────────────────────────────────────────────

let _db: import('better-sqlite3').Database | null = null;

function getSqliteDb(): import('better-sqlite3').Database {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3') as typeof import('better-sqlite3');
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tab TEXT NOT NULL,
        date TEXT NOT NULL,
        customer TEXT NOT NULL,
        category TEXT NOT NULL,
        value REAL,
        unit TEXT,
        is_estimate INTEGER DEFAULT 0,
        version TEXT,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tab ON metrics(tab);
      CREATE INDEX IF NOT EXISTS idx_tab_customer ON metrics(tab, customer);
      CREATE INDEX IF NOT EXISTS idx_tab_date ON metrics(tab, date);
      CREATE INDEX IF NOT EXISTS idx_tab_cat ON metrics(tab, category);
    `);
  }
  return _db;
}

/** Legacy accessor kept for scripts/seed.ts which uses it directly */
export function getDb(): import('better-sqlite3').Database {
  return getSqliteDb();
}

// ── Postgres helpers ───────────────────────────────────────────────────────────

async function pgQueryRaw(query: string, values: (string | number | null)[]): Promise<MetricRow[]> {
  const { sql } = await import('@vercel/postgres');
  // Build a tagged-template-compatible call by using the underlying query method
  // @vercel/postgres exposes a `query` function via createPool or we can use the sql
  // tagged template. Since we need dynamic queries, we use the pool query directly.
  const { db } = await import('@vercel/postgres');
  const result = await db.query(query, values);
  return result.rows as MetricRow[];
}

// ── Public async query API ─────────────────────────────────────────────────────

/**
 * Fetch all rows for a tab, optionally filtered by customer and/or category.
 */
export async function queryMetrics(
  tab: string,
  filters?: { customer?: string; category?: string; date?: string },
): Promise<MetricRow[]> {
  if (isPostgres()) {
    let query = 'SELECT * FROM metrics WHERE tab = $1';
    const params: (string | number | null)[] = [tab];
    let idx = 2;
    if (filters?.customer) { query += ` AND customer = $${idx++}`; params.push(filters.customer); }
    if (filters?.category) { query += ` AND category = $${idx++}`; params.push(filters.category); }
    if (filters?.date)     { query += ` AND date = $${idx++}`;     params.push(filters.date); }
    return pgQueryRaw(query, params);
  }

  // SQLite (synchronous, wrapped in Promise for uniform API)
  const db = getSqliteDb();
  let sqlStr = 'SELECT * FROM metrics WHERE tab = ?';
  const sqlParams: (string | number)[] = [tab];
  if (filters?.customer) { sqlStr += ' AND customer = ?'; sqlParams.push(filters.customer); }
  if (filters?.category) { sqlStr += ' AND category = ?'; sqlParams.push(filters.category); }
  if (filters?.date)     { sqlStr += ' AND date = ?';     sqlParams.push(filters.date); }
  return db.prepare(sqlStr).all(...sqlParams) as MetricRow[];
}

/**
 * Fetch all rows for a tab ordered by id ASC.
 */
export async function queryAll(tab: string): Promise<MetricRow[]> {
  if (isPostgres()) {
    return pgQueryRaw('SELECT * FROM metrics WHERE tab = $1 ORDER BY id ASC', [tab]);
  }
  const db = getSqliteDb();
  try {
    return db.prepare('SELECT * FROM metrics WHERE tab = ? ORDER BY id ASC').all(tab) as MetricRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch rows where category LIKE `${categoryPrefix}%`.
 */
export async function queryMetricsLike(tab: string, categoryPrefix: string): Promise<MetricRow[]> {
  if (isPostgres()) {
    return pgQueryRaw(
      'SELECT * FROM metrics WHERE tab = $1 AND category LIKE $2',
      [tab, `${categoryPrefix}%`],
    );
  }
  const db = getSqliteDb();
  try {
    return db
      .prepare('SELECT * FROM metrics WHERE tab = ? AND category LIKE ?')
      .all(tab, `${categoryPrefix}%`) as MetricRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch rows where category IN (categories).
 */
export async function queryMetricsIn(tab: string, categories: string[]): Promise<MetricRow[]> {
  if (categories.length === 0) return [];
  if (isPostgres()) {
    const placeholders = categories.map((_, i) => `$${i + 2}`).join(', ');
    return pgQueryRaw(
      `SELECT * FROM metrics WHERE tab = $1 AND category IN (${placeholders})`,
      [tab, ...categories],
    );
  }
  const db = getSqliteDb();
  try {
    const placeholders = categories.map(() => '?').join(', ');
    return db
      .prepare(`SELECT * FROM metrics WHERE tab = ? AND category IN (${placeholders})`)
      .all(tab, ...categories) as MetricRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch rows for a tab filtered by customer, ordered by id ASC.
 */
export async function queryByCustomer(tab: string, customerId?: string): Promise<MetricRow[]> {
  if (isPostgres()) {
    if (customerId) {
      return pgQueryRaw(
        'SELECT * FROM metrics WHERE tab = $1 AND customer = $2 ORDER BY id ASC',
        [tab, customerId],
      );
    }
    return pgQueryRaw('SELECT * FROM metrics WHERE tab = $1 ORDER BY id ASC', [tab]);
  }
  const db = getSqliteDb();
  try {
    if (customerId) {
      return db
        .prepare('SELECT * FROM metrics WHERE tab = ? AND customer = ? ORDER BY id ASC')
        .all(tab, customerId) as MetricRow[];
    }
    return db
      .prepare('SELECT * FROM metrics WHERE tab = ? ORDER BY id ASC')
      .all(tab) as MetricRow[];
  } catch {
    return [];
  }
}
