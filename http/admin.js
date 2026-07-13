import { HttpResponse } from '#utils/http-utils.js';

export default {
  name: 'postgres-core-admin',
  dsc: 'Postgres-Core 健康检查与管理 API',
  priority: 90,

  routes: [
    {
      method: 'GET',
      path: '/api/postgres-core/health',
      systemAuth: false,
      handler: HttpResponse.asyncHandler(async (_req, res) => {
        let ok = false;
        let migration = { applied: [], pending: [] };
        try {
          const svc = globalThis.PostgresService;
          if (svc?.ping) ok = await svc.ping();
          if (ok && svc?.getMigrationStatus) {
            migration = await svc.getMigrationStatus();
          }
        } catch {
          ok = false;
        }
        HttpResponse.success(res, {
          status: ok ? 'operational' : 'down',
          postgres: ok ? 'connected' : 'disconnected',
          migrations: migration,
          timestamp: Date.now(),
        });
      }, 'postgres-core.health'),
    },
    {
      method: 'GET',
      path: '/api/postgres-core/tables',
      handler: HttpResponse.asyncHandler(async (_req, res) => {
        const svc = globalThis.PostgresService;
        if (!svc?.listTables) {
          return HttpResponse.error(res, new Error('PostgresService 未初始化'), 503, 'postgres-core.tables');
        }
        HttpResponse.success(res, { tables: svc.listTables() });
      }, 'postgres-core.tables'),
    },
    {
      method: 'GET',
      path: '/api/postgres-core/admin/stats',
      handler: HttpResponse.asyncHandler(async (_req, res) => {
        const svc = globalThis.PostgresService;
        if (!svc?.getPool) {
          return HttpResponse.error(res, new Error('PostgresService 未初始化'), 503, 'postgres-core.stats');
        }
        const pool = svc.getPool();
        const registered = svc.listTables?.() ?? [];
        const stats = [];
        for (const entry of registered) {
          try {
            const countRes = await pool.query(`SELECT COUNT(*)::int AS count FROM ${entry.name}`);
            const idxRes = await pool.query(
              `SELECT COUNT(*)::int AS count FROM pg_indexes WHERE tablename = $1`,
              [entry.name]
            );
            stats.push({
              name: entry.name,
              owner: entry.owner,
              entity: entry.entity,
              count: countRes.rows[0]?.count ?? 0,
              indexes: idxRes.rows[0]?.count ?? 0,
            });
          } catch (err) {
            stats.push({ name: entry.name, error: err.message });
          }
        }
        HttpResponse.success(res, { stats });
      }, 'postgres-core.stats'),
    },
  ],
};
