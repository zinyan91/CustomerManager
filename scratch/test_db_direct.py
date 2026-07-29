import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

cur.execute('SELECT "Id", "CustomerId", "ContractNumber" FROM "LoanContracts" WHERE "CustomerId" = 5;')
rows = cur.fetchall()
print("Direct DB query for CustomerId=5:")
for r in rows:
    print(r)

cur.execute('SELECT "Id", "CifKh", "FullName" FROM "Customers" WHERE "Id" = 5;')
print("Customer Id=5:", cur.fetchall())

conn.close()
