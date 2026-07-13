# Postgres-Core — 产品 Agent 规则

- 完整 API：**[`docs/API.md`](./docs/API.md)**
- 强事务、关系型、报表**优先** `PostgresService` / `postgres-Core/lib`
- 灵活文档继续用 `mongodb-Core`
- `registerTable` + `migrations/` 建表，禁止裸 `new Pool()`
- 表名 `<core>_<entity>`；缓存/锁用 Redis
