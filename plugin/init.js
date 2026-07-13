import plugin from '#infrastructure/plugins/plugin.js';
import { setRuntimeGlobal } from '#utils/runtime-globals.js';
import * as PostgresService from '../lib/index.js';

export default class PostgresCoreInit extends plugin {
  constructor() {
    super({
      name: 'postgres-core-init',
      dsc: 'Postgres-Core 启动：迁移、索引、挂载 PostgresService',
      event: 'message',
      priority: 1,
    });
  }

  async init() {
    if (PostgresCoreInit._booted) return;
    PostgresCoreInit._booted = true;
    try {
      const result = await PostgresService.bootstrap();
      setRuntimeGlobal('PostgresService', PostgresService);
      const mig = result.migrations?.length ? result.migrations.join(',') : 'none';
      logger.mark(`[postgres-Core] bootstrap OK migrations=[${mig}]`);
    } catch (err) {
      logger.error(`[postgres-Core] bootstrap 失败: ${err.message}`);
      throw err;
    }
  }
}

PostgresCoreInit._booted = false;
