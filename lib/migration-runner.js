import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPool } from './client.js';
import { MIGRATION_TABLE } from './index-manager.js';
import paths from '#utils/paths.js';

/**
 * @typedef {{ id: string, up: (pool: import('pg').Pool) => Promise<void> }} Migration
 */

/** @returns {Promise<string[]>} */
async function listMigrationFiles() {
  const root = path.join(paths.root, 'core', 'postgres-Core', 'migrations');
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.name.endsWith('.js') && !ent.name.startsWith('_')) out.push(full);
    }
  }
  await walk(root);
  return out.sort();
}

/** @param {string} file */
async function loadMigration(file) {
  const mod = await import(pathToFileURL(file).href);
  const migration = mod.default ?? mod;
  if (!migration?.id || typeof migration.up !== 'function') {
    throw new Error(`[postgres-Core] 无效迁移文件: ${file}`);
  }
  return /** @type {Migration} */ (migration);
}

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file TEXT
    )
  `);
}

export async function getMigrationStatus() {
  const pool = getPool();
  await ensureMigrationTable(pool);
  const { rows: appliedRows } = await pool.query(
    `SELECT id FROM ${MIGRATION_TABLE} ORDER BY id ASC`
  );
  const files = await listMigrationFiles();
  const pending = [];
  const appliedIds = new Set(appliedRows.map((d) => d.id));
  for (const file of files) {
    const m = await loadMigration(file);
    if (!appliedIds.has(m.id)) pending.push(m.id);
  }
  return { applied: appliedRows.map((d) => d.id), pending, total: files.length };
}

export async function runMigrations() {
  const pool = getPool();
  await ensureMigrationTable(pool);
  const files = await listMigrationFiles();
  const applied = [];
  for (const file of files) {
    const migration = await loadMigration(file);
    const { rows } = await pool.query(
      `SELECT 1 FROM ${MIGRATION_TABLE} WHERE id = $1 LIMIT 1`,
      [migration.id]
    );
    if (rows.length) continue;
    await migration.up(pool);
    await pool.query(
      `INSERT INTO ${MIGRATION_TABLE} (id, file) VALUES ($1, $2)`,
      [migration.id, path.relative(paths.root, file)]
    );
    applied.push(migration.id);
  }
  return applied;
}
