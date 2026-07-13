# postgres-Core API 参考

本文档描述 postgres-Core 对外公开的 JavaScript API。业务 Core 通过 `lib/index.js` 接入 PostgreSQL。

---

## 生命周期

| 函数 | 说明 |
|------|------|
| `bootstrap()` | 读配置 → 表前缀 → 注册系统表元数据 → SQL 迁移 → 索引 SQL |
| `connect()` | 创建 `pg.Pool` |
| `ping()` | `SELECT 1` |
| `close()` | `pool.end()` |

全局：`PostgresService`（`plugin/init.js` 挂载）。

---

## 连接

| 函数 | 返回 | 说明 |
|------|------|------|
| `getPool()` | `Pool` | 连接池 |
| `getPostgresCoreConfig()` | `Promise<object>` | `data/postgres-core/config.yaml` |

---

## 命名空间

| 函数 | 说明 |
|------|------|
| `registerTable(owner, entity, options?)` | 注册表元数据（DDL 在 migrations） |
| `getTableEntry(owner, entity)` | 取注册项 |
| `listTables()` | 全部已注册 |
| `buildTableName(owner, entity)` | 物理表名（含 `tablePrefix`） |
| `setTablePrefix(prefix)` | bootstrap 内部 |

**物理表名**：`[prefix_]owner_entity`，与 Mongo 集合同规则。

### registerTable options

```javascript
registerTable('lsy', 'orders', {
  schemaVersion: 1,
  indexSql: [
    'CREATE INDEX IF NOT EXISTS lsy_orders_user ON lsy_orders (user_id)',
  ],
});
```

表结构必须在 **migration** 里 `CREATE TABLE`，register 只声明索引与版本。

---

## Repository 基类

```javascript
import { registerTable, Repository, withTransaction } from '../../../postgres-Core/lib/index.js';

const ORDERS = registerTable('lsy', 'orders', {
  indexSql: ['CREATE INDEX IF NOT EXISTS lsy_orders_status ON lsy_orders (status)'],
});

export class OrderRepo extends Repository {
  constructor() {
    super(ORDERS);
  }

  findByOrderId(orderId) {
    return this.findOne({ order_id: orderId });
  }

  create(row) {
    return this.insert(row);
  }
}
```

| 方法 | 说明 |
|------|------|
| `query(sql, params?)` | 参数化查询（`$1,$2`） |
| `insert(row)` | `INSERT ... RETURNING *` |
| `findOne(where)` | 等值 WHERE |
| `findMany(where?, { limit, offset, orderBy })` | 列表；`orderBy` 仅允许安全字符 |
| `updateWhere(patch, where)` | 更新 |
| `deleteWhere(where)` | 删除 |
| `count(where?)` | `COUNT(*)` |

复杂 JOIN 在子类写 **参数化** SQL：

```javascript
async reportSince(since) {
  const { rows } = await this.query(
    'SELECT status, COUNT(*)::int AS n FROM lsy_orders WHERE created_at >= $1 GROUP BY status',
    [since]
  );
  return rows;
}
```

---

## 事务

```javascript
import { withTransaction, withClient } from '../../../postgres-Core/lib/index.js';

await withTransaction(async (client) => {
  await client.query('UPDATE lsy_orders SET status = $1 WHERE order_id = $2', ['paid', id]);
  await client.query('INSERT INTO lsy_ledger (...) VALUES (...)', [...]);
});
```

| 函数 | 说明 |
|------|------|
| `withTransaction(fn)` | BEGIN / COMMIT / ROLLBACK |
| `withClient(fn)` | 借连接，不自动事务 |

---

## SQL 迁移

目录：`core/postgres-Core/migrations/**/*.js`

```javascript
export default {
  id: '002_lsy_orders',
  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lsy_orders (
        id BIGSERIAL PRIMARY KEY,
        order_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },
};
```

| 函数 | 说明 |
|------|------|
| `runMigrations()` | 执行 pending |
| `getMigrationStatus()` | `{ applied, pending, total }` |

记录表：`_postgres_core_migrations`。

---

## 索引

| 函数 | 说明 |
|------|------|
| `ensureIndexes()` | 执行各表 `indexSql` |
| `ensureTableIndexes(indexSql[])` | 单表 |

---

## 多租户辅助

| 函数 | 说明 |
|------|------|
| `tenantTableName(owner, entity)` | 表名 |
| `tenantScope(owner, where?)` | WHERE 加 `owner` 列 |
| `withTenantMeta(owner, row)` | 行加 `owner`、`updated_at` |

---

## HTTP Admin

| 路径 | 说明 |
|------|------|
| `GET /api/postgres-core/health` | 连接 + 迁移 |
| `GET /api/postgres-core/tables` | 已注册表 |
| `GET /api/postgres-core/admin/stats` | 行数、索引数 |

---

## 配置

路径：`data/postgres-core/config.yaml`

| 字段 | 说明 |
|------|------|
| `connection.host/port/database/username/password` | Postgres |
| `connection.poolSize` | 池大小，默认 10 |
| `runMigrationsOnBoot` / `ensureIndexesOnBoot` | 启动行为 |
| `tablePrefix` | 全局表前缀 |

---

## 与 mongodb-Core 分工

| 场景 | 选用 |
|------|------|
| 订单、账务、库存、报表 | postgres-Core |
| 聊天、画像、JSON 文档 | mongodb-Core |
| 缓存、锁 | Redis（Runtime） |

同一业务 Core 可同时依赖 mongodb-Core 与 postgres-Core；同一实体应选定一种存储，避免双写除非有同步方案。
