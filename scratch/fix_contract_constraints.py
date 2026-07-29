import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

try:
    cur.execute('ALTER TABLE "LoanContracts" DROP CONSTRAINT IF EXISTS "UQ_LoanContracts_ContractNumber";')
    conn.commit()
    print("SUCCESS: Dropped UQ_LoanContracts_ContractNumber constraint")
except Exception as e:
    conn.rollback()
    print("ERROR:", e)

# Make ContractType DEFAULT 0
try:
    cur.execute('ALTER TABLE "LoanContracts" ALTER COLUMN "ContractType" SET DEFAULT 0;')
    conn.commit()
    print("SUCCESS: Set ContractType DEFAULT 0")
except Exception as e:
    conn.rollback()
    print("ERROR:", e)

conn.close()
