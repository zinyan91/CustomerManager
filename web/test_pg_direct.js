import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log("Connecting directly to PostgreSQL db.xkzntlaybrjlkcymqius.supabase.co...");
  try {
    const res = await pool.query('SELECT "Id", "CifKh", "FullName", "MaritalStatus", "SpouseName", "AccountNumber" FROM "Customers" ORDER BY "Id" DESC LIMIT 10;');
    console.log("SUCCESS! Returned customers count:", res.rows.length);
    console.log("Sample customer:", res.rows[0]);
  } catch (err) {
    console.error("PG ERROR:", err);
  } finally {
    await pool.end();
  }
}

test();
