import { getPool } from './client.js';
import { getTableEntry } from './table-registry.js';

function assertSafeIdent(name) {
  if (!/^[a-z][a-z0-9_]*$/i.test(String(name || ''))) {
    throw new Error(`[postgres-Core] 非法表名: ${name}`);
  }
  return String(name);
}

/**
 * PostgreSQL Repository 基类 — 业务 Core 继承或组合使用
 * @example
 * const USERS = registerTable('lsy', 'users');
 * class UserRepo extends Repository {
 *   constructor() { super(USERS); }
 * }
 */
export class Repository {
  /** @param {import('./table-registry.js').TableEntry | { name: string }} tableRef */
  constructor(tableRef) {
    const name = tableRef?.name ?? tableRef;
    if (!name) throw new Error('[postgres-Core] Repository 需要表引用');
    this.tableName = assertSafeIdent(name);
  }

  /** @param {string} sql @param {unknown[]} [params] */
  query(sql, params = []) {
    return getPool().query(sql, params);
  }

  /** @param {Record<string, unknown>} row */
  async insert(row) {
    const keys = Object.keys(row);
    if (!keys.length) throw new Error('[postgres-Core] insert 需要至少一个字段');
    const cols = keys.map((k) => assertSafeIdent(k)).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const { rows } = await this.query(sql, Object.values(row));
    return rows[0] ?? null;
  }

  /** @param {Record<string, unknown>} patch @param {Record<string, unknown>} where */
  async updateWhere(patch, where) {
    const setKeys = Object.keys(patch);
    const whereKeys = Object.keys(where);
    if (!setKeys.length || !whereKeys.length) {
      throw new Error('[postgres-Core] updateWhere 需要 patch 与 where');
    }
    let idx = 1;
    const setClause = setKeys.map((k) => `${assertSafeIdent(k)} = $${idx++}`).join(', ');
    const whereClause = whereKeys.map((k) => `${assertSafeIdent(k)} = $${idx++}`).join(' AND ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const params = [...Object.values(patch), ...Object.values(where)];
    const { rows } = await this.query(sql, params);
    return rows;
  }

  /** @param {Record<string, unknown>} where */
  async findOne(where) {
    const keys = Object.keys(where);
    if (!keys.length) throw new Error('[postgres-Core] findOne 需要 where 条件');
    const clause = keys.map((k, i) => `${assertSafeIdent(k)} = $${i + 1}`).join(' AND ');
    const sql = `SELECT * FROM ${this.tableName} WHERE ${clause} LIMIT 1`;
    const { rows } = await this.query(sql, Object.values(where));
    return rows[0] ?? null;
  }

  /** @param {Record<string, unknown>} [where] @param {{ limit?: number, offset?: number, orderBy?: string }} [options] */
  async findMany(where = {}, options = {}) {
    const keys = Object.keys(where);
    const params = Object.values(where);
    let sql = `SELECT * FROM ${this.tableName}`;
    if (keys.length) {
      const clause = keys.map((k, i) => `${assertSafeIdent(k)} = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${clause}`;
    }
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    if (options.limit != null) {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (options.offset != null) {
      params.push(options.offset);
      sql += ` OFFSET $${params.length}`;
    }
    const { rows } = await this.query(sql, params);
    return rows;
  }

  /** @param {Record<string, unknown>} where */
  async deleteWhere(where) {
    const keys = Object.keys(where);
    if (!keys.length) throw new Error('[postgres-Core] deleteWhere 需要 where 条件');
    const clause = keys.map((k, i) => `${assertSafeIdent(k)} = $${i + 1}`).join(' AND ');
    const sql = `DELETE FROM ${this.tableName} WHERE ${clause} RETURNING *`;
    const { rows } = await this.query(sql, Object.values(where));
    return rows;
  }

  /** @param {Record<string, unknown>} [where] */
  async count(where = {}) {
    const keys = Object.keys(where);
    const params = Object.values(where);
    let sql = `SELECT COUNT(*)::int AS count FROM ${this.tableName}`;
    if (keys.length) {
      const clause = keys.map((k, i) => `${assertSafeIdent(k)} = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${clause}`;
    }
    const { rows } = await this.query(sql, params);
    return rows[0]?.count ?? 0;
  }

  /** 按 owner:entity 解析已注册表 */
  static fromRegistered(owner, entity) {
    const entry = getTableEntry(owner, entity);
    return new Repository(entry);
  }
}
