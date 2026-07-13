/**
 * Postgres-Core 公开 API — 业务 Core 唯一应 import 的入口
 *
 * @example
 * import { registerTable, Repository, bootstrap } from '../../../postgres-Core/lib/index.js';
 */
export { getPool, connect, ping, close } from './client.js';
export {
  registerTable,
  getTableEntry,
  listTables,
  assertRegistered,
} from './table-registry.js';
export { Repository } from './repository-base.js';
export { withTransaction, withClient } from './transaction.js';
export { runMigrations, getMigrationStatus } from './migration-runner.js';
export { ensureIndexes, MIGRATION_TABLE } from './index-manager.js';
export { tenantTableName, tenantScope, withTenantMeta } from './tenant.js';
export { getPostgresCoreConfig } from './config.js';
export { setTablePrefix, getTablePrefix, buildTableName, assertSafeOrderBy } from './naming.js';

import { registerTable } from './table-registry.js';
import { getPostgresCoreConfig } from './config.js';
import { ensureIndexes } from './index-manager.js';
import { runMigrations } from './migration-runner.js';
import { connect, ping } from './client.js';
import { setTablePrefix } from './naming.js';

function registerSystemTables() {
  registerTable('system', 'audit', {
    schemaVersion: 1,
    indexSql: ['CREATE INDEX IF NOT EXISTS system_audit_at ON system_audit (created_at DESC)'],
  });
}

let bootstrapped = false;

/**
 * 启动 bootstrap：注册系统表元数据、迁移、索引
 * @returns {Promise<{ ok: boolean, migrations?: string[], indexes?: object[] }>}
 */
export async function bootstrap() {
  if (bootstrapped) return { ok: true, skipped: true };
  bootstrapped = true;

  const alive = await connect().then(() => ping());
  if (!alive) {
    throw new Error('[postgres-Core] PostgreSQL 不可用，无法 bootstrap');
  }

  const config = await getPostgresCoreConfig();
  setTablePrefix(config.tablePrefix);

  registerSystemTables();
  /** @type {string[]} */
  let migrations = [];
  /** @type {object[]} */
  let indexes = [];

  if (config.runMigrationsOnBoot !== false) {
    migrations = await runMigrations();
  }
  if (config.ensureIndexesOnBoot !== false) {
    indexes = await ensureIndexes();
  }

  return { ok: true, migrations, indexes };
}
