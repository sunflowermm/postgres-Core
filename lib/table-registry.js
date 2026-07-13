import { buildTableName } from './naming.js';

/** @typedef {{ name: string, owner: string, entity: string, indexSql?: string[], schemaVersion?: number, registeredAt: number }} TableEntry */

/** @type {Map<string, TableEntry>} */
const registry = new Map();

/**
 * 注册表（业务 Core 必须通过此 API，禁止裸写表名）
 * @param {string} owner Core 名，如 lsy、jm、system
 * @param {string} entity 实体名，如 users、orders
 * @param {{ indexSql?: string[], schemaVersion?: number }} [options]
 */
export function registerTable(owner, entity, options = {}) {
  const o = String(owner || '').trim();
  const e = String(entity || '').trim();
  if (!o || !e) {
    throw new Error('[postgres-Core] registerTable 需要 owner 与 entity');
  }
  if (!/^[a-z][a-z0-9_]*$/i.test(o) || !/^[a-z][a-z0-9_]*$/i.test(e)) {
    throw new Error('[postgres-Core] owner/entity 仅允许字母数字下划线');
  }
  const name = buildTableName(o, e);
  const key = `${o}:${e}`;
  if (registry.has(key)) {
    return registry.get(key);
  }
  const entry = {
    name,
    owner: o,
    entity: e,
    indexSql: options.indexSql ?? [],
    schemaVersion: options.schemaVersion ?? 1,
    registeredAt: Date.now(),
  };
  registry.set(key, entry);
  return entry;
}

/** @param {string} owner @param {string} entity */
export function getTableEntry(owner, entity) {
  const entry = registry.get(`${owner}:${entity}`);
  if (!entry) {
    throw new Error(`[postgres-Core] 表未注册: ${owner}:${entity}，请先 registerTable`);
  }
  return entry;
}

export function listTables() {
  return [...registry.values()];
}

/** @param {string} owner @param {string} entity */
export function assertRegistered(owner, entity) {
  getTableEntry(owner, entity);
  return true;
}

export function clearRegistryForTests() {
  registry.clear();
}
