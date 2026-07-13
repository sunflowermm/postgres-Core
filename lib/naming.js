/** @type {string} */
let globalPrefix = '';

/**
 * 设置全局表前缀（bootstrap 时从 config.tablePrefix 注入）
 * @param {string} [prefix]
 */
export function setTablePrefix(prefix) {
  globalPrefix = String(prefix ?? '').trim().replace(/_+$/, '');
}

/** @returns {string} */
export function getTablePrefix() {
  return globalPrefix;
}

/**
 * 生成物理表名：可选 prefix + owner + entity
 * @param {string} owner
 * @param {string} entity
 * @returns {string}
 */
export function buildTableName(owner, entity) {
  const o = String(owner || '').trim();
  const e = String(entity || '').trim();
  const base = `${o}_${e}`;
  return globalPrefix ? `${globalPrefix}_${base}` : base;
}

/** @param {string} orderBy 仅允许字母数字下划线逗号空格点 */
export function assertSafeOrderBy(orderBy) {
  const s = String(orderBy ?? '').trim();
  if (!s || !/^[a-zA-Z0-9_.,\s]+$/.test(s)) {
    throw new Error('[postgres-Core] orderBy 含非法字符');
  }
  return s;
}
