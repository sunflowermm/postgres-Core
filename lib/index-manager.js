import { getPool } from './client.js';
import { listTables } from './table-registry.js';

export const MIGRATION_TABLE = '_postgres_core_migrations';

/**
 * 为所有已注册表执行声明的 indexSql
 */
export async function ensureIndexes() {
  const pool = getPool();
  const results = [];
  for (const entry of listTables()) {
    if (!entry.indexSql?.length) continue;
    const applied = [];
    for (const sql of entry.indexSql) {
      await pool.query(sql);
      applied.push(sql);
    }
    results.push({ table: entry.name, indexes: applied.length });
  }
  return results;
}

/** @param {string[]} indexSql */
export async function ensureTableIndexes(indexSql) {
  if (!indexSql?.length) return [];
  const pool = getPool();
  for (const sql of indexSql) {
    await pool.query(sql);
  }
  return indexSql;
}
