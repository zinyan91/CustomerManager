import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

cur.execute("""
    SELECT "Id", "CustomerId", "ContractNumber", "LoanMethod", "ContractAmount", "LoanAmount"
    FROM "LoanContracts"
    ORDER BY "Id" DESC LIMIT 20;
""")

rows = cur.fetchall()
print(f"Total rows found: {len(rows)}")
for r in rows:
    print(r[0], r[1], r[2], r[3])

# Check constraints
cur.execute("""
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = '"LoanContracts"'::regclass;
""")
print("\nConstraints on LoanContracts:")
for c in cur.fetchall():
    print(c)

conn.close()
