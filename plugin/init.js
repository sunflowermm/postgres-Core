import plugin from '#infrastructure/plugins/plugin.js';
import { setRuntimeGlobal } from '#utils/runtime-globals.js';
import { normalizeError } from '#utils/normalize-error.js';
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
      const error = normalizeError(err);
      logger.warn(`[postgres-Core] bootstrap 跳过: ${error.message}`);
    }
  }
}

PostgresCoreInit._booted = false;
