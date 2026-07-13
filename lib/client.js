import pg from 'pg';
import { getPostgresCoreConfig } from './config.js';

const { Pool } = pg;

/** @type {import('pg').Pool | null} */
let pool = null;

function buildPoolConfig(conn) {
  const host = conn.host || '127.0.0.1';
  const port = conn.port ?? 5432;
  const database = conn.database || 'xrk_agt';
  const user = conn.username?.trim() || conn.user?.trim() || 'postgres';
  const password = conn.password ?? '';
  return {
    host,
    port,
    database,
    user,
    password,
    max: conn.max ?? conn.poolSize ?? 10,
    idleTimeoutMillis: conn.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: conn.connectionTimeoutMillis ?? 10_000,
    ssl: conn.ssl === true ? { rejectUnauthorized: false } : conn.ssl,
    ...(conn.options && typeof conn.options === 'object' ? conn.options : {}),
  };
}

/** 建立 PostgreSQL 连接池（由 bootstrap 调用） */
export async function connect() {
  if (pool) return pool;
  const config = await getPostgresCoreConfig();
  const conn = config.connection && typeof config.connection === 'object' ? config.connection : {};
  pool = new Pool(buildPoolConfig(conn));
  await pool.query('SELECT 1');
  return pool;
}

/** @returns {import('pg').Pool} */
export function getPool() {
  if (!pool) {
    throw new Error('[postgres-Core] PostgreSQL 未连接，请确认 postgres-Core 已 bootstrap 且 connection 配置正确');
  }
  return pool;
}

export async function ping() {
  try {
    const p = pool ?? await connect();
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function close() {
  if (pool) await pool.end();
  pool = null;
}
