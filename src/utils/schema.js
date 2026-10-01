import pool from '../config/db.js';

const CACHE_MS = 30_000;
const tableCache = new Map();
const columnCache = new Map();

function fresh(entry) {
  return entry && (Date.now() - entry.at) < CACHE_MS;
}

export async function tableExists(table) {
  const cached = tableCache.get(table);
  if (fresh(cached)) return cached.value;

  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  const value = Number(row?.total || 0) > 0;
  tableCache.set(table, { at: Date.now(), value });
  return value;
}

export async function getColumns(table) {
  const cached = columnCache.get(table);
  if (fresh(cached)) return cached.value;

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  const value = new Set(rows.map((r) => r.COLUMN_NAME));
  columnCache.set(table, { at: Date.now(), value });
  return value;
}

export function clearSchemaCache() {
  tableCache.clear();
  columnCache.clear();
}
