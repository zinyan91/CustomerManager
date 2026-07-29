import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

cur.execute('SELECT "Id", "CifKh" FROM "Customers" WHERE "CifKh" = \'005391337\';')
cus = cur.fetchall()
print("Customer 005391337:", cus)

cur.execute('SELECT "Id", "CustomerId", "ContractNumber" FROM "LoanContracts";')
contracts = cur.fetchall()
print("\nAll Contracts in LoanContracts:")
for c in contracts:
    print(f"Contract Id={c[0]}, CustomerId={c[1]}, Number={c[2]}")

conn.close()
