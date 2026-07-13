/** @type {{ id: string, up: (pool: import('pg').Pool) => Promise<void> }} */
export default {
  id: '001_postgres_core_meta',
  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _postgres_core_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        file TEXT
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_audit (
        id BIGSERIAL PRIMARY KEY,
        owner TEXT NOT NULL DEFAULT 'system',
        action TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },
};
