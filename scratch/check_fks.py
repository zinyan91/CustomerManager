import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

# Check foreign keys on LoanContracts
cur.execute("""
    SELECT
        tc.table_schema, 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'LoanContracts';
""")

print("Foreign Keys on LoanContracts:")
for fk in cur.fetchall():
    print(fk)

conn.close()
