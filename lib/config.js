import ConfigBase from '#infrastructure/commonconfig/commonconfig.js';

let configInstance;

export default class PostgresCoreConfig extends ConfigBase {
  constructor() {
    super({
      name: 'postgres-core',
      displayName: 'Postgres-Core',
      description: 'Postgres-Core 业务层：迁移、索引、事务与命名空间策略',
      filePath: 'data/postgres-core/config.yaml',
      defaultTemplatePath: 'core/postgres-Core/default/postgres-core.yaml',
      fileType: 'yaml',
      schema: PostgresCoreConfig.schemaDefinition(),
    });
  }

  static schemaDefinition() {
    return {
      fields: {
        runMigrationsOnBoot: {
          type: 'boolean',
          label: '启动时执行迁移',
          description: 'Bot 启动时自动运行 core/postgres-Core/migrations 下未应用的脚本',
          default: true,
          component: 'Switch',
        },
        ensureIndexesOnBoot: {
          type: 'boolean',
          label: '启动时确保索引',
          description: '根据 registerTable 声明的 indexSql 自动执行',
          default: true,
          component: 'Switch',
        },
        auditWrites: {
          type: 'boolean',
          label: '写操作审计',
          description: '记录表写入到 system_audit（实验性）',
          default: false,
          component: 'Switch',
        },
        tablePrefix: {
          type: 'string',
          label: '全局表前缀',
          description: '留空则仅使用 <core>_<entity>；非空时为 <prefix>_<core>_<entity>',
          default: '',
          component: 'Input',
        },
        connection: {
          type: 'object',
          label: 'PostgreSQL 连接',
          description: '业务 Core 自行建连，不依赖 AGT Runtime',
          component: 'SubForm',
          fields: {
            host: { type: 'string', label: '地址', default: '127.0.0.1', component: 'Input' },
            port: { type: 'number', label: '端口', default: 5432, component: 'InputNumber' },
            database: { type: 'string', label: '数据库', default: 'xrk_agt', component: 'Input' },
            username: { type: 'string', label: '用户名', default: 'postgres', component: 'Input' },
            password: { type: 'string', label: '密码', default: '', component: 'InputPassword' },
            poolSize: { type: 'number', label: '连接池大小', default: 10, component: 'InputNumber' },
          },
        },
      },
    };
  }
}

/** @returns {Promise<Record<string, unknown>>} */
export async function getPostgresCoreConfig() {
  if (!configInstance) configInstance = new PostgresCoreConfig();
  return configInstance.read();
}

export function getPostgresCoreConfigClass() {
  return PostgresCoreConfig;
}
