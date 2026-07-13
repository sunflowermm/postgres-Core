/**
 * 多租户 / Core 命名空间辅助
 * 表名格式：<owner>_<entity>，由 registerTable 统一生成
 */

/** @param {string} owner @param {string} entity */
export function tenantTableName(owner, entity) {
  const o = String(owner || '').trim();
  const e = String(entity || '').trim();
  if (!o || !e) throw new Error('[postgres-Core] tenantTableName 参数无效');
  return `${o}_${e}`;
}

/**
 * 为 WHERE 注入 owner 隔离（业务表含 owner 列时使用）
 * @param {string} owner
 * @param {Record<string, unknown>} [where]
 */
export function tenantScope(owner, where = {}) {
  return { ...where, owner: String(owner) };
}

/**
 * 写入行附加租户元数据
 * @param {string} owner
 * @param {Record<string, unknown>} row
 */
export function withTenantMeta(owner, row) {
  return {
    ...row,
    owner: String(owner),
    updated_at: new Date(),
  };
}
