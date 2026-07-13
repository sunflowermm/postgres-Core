# Postgres-Core — 产品 Agent 规则

- 强事务、关系型、报表类数据**优先**走 `PostgresService` 或 `import ... from postgres-Core/lib/index.js`
- 灵活文档、快速迭代实体可继续用 `mongodb-Core`
- 新建表前在代码里 `registerTable('<你的core名>', '<实体>')`，DDL 写在 `migrations/`
- 不要自造表名；格式固定为 `<core>_<entity>`
- 临时状态、计数、锁用 Redis（全局 `redis`），不要写 Postgres
