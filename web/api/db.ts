import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres';

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
