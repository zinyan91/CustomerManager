import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log("Fetching all contracts with joined customer...");
  try {
    const res = await pool.query(`
      SELECT l.*, 
             json_build_object('Id', cust."Id", 'CifKh', cust."CifKh", 'FullName', cust."FullName", 'AccountNumber', cust."AccountNumber") as customer
      FROM "LoanContracts" l
      LEFT JOIN "Customers" cust ON l."CustomerId" = cust."Id"
      ORDER BY l."Id" DESC;
    `);

    console.log(`SUCCESS! Loaded ${res.rows.length} loan contracts.`);
    if (res.rows.length > 0) {
      console.log("Sample LoanContract:", res.rows[0]);
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

test();
