import pg from 'pg';

let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Thiếu biến môi trường DATABASE_URL.');
    }
    poolInstance = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
      max: 5
    });
  }
  return poolInstance;
}
