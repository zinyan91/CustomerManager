import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log("Testing contract insertion into PostgreSQL...");
  try {
    const custRes = await pool.query('SELECT "Id" FROM "Customers" LIMIT 1;');
    const customerId = custRes.rows[0].Id;
    
    const insertRes = await pool.query(`
      INSERT INTO "LoanContracts" (
        "CustomerId", "ContractNumber", "ContractType", "ContractAmount", "DebtGroup"
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [customerId, 'HD_TEST_VERCEL_SUCCESS', 0, 960000000, 1]);

    console.log("INSERT SUCCESSFUL! New Contract:", insertRes.rows[0]);

    // Clean up
    await pool.query('DELETE FROM "LoanContracts" WHERE "ContractNumber" = \'HD_TEST_VERCEL_SUCCESS\';');
  } catch (err) {
    console.error("INSERT ERROR:", err);
  } finally {
    await pool.end();
  }
}

test();
