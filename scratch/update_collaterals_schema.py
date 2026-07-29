import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

# Check existing columns in Collaterals
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'Collaterals';
""")
cols = cur.fetchall()
print("Collaterals columns:")
for c in cols:
    print(c)

# Add missing columns if needed
try:
    cur.execute('ALTER TABLE "Collaterals" ADD COLUMN IF NOT EXISTS "AppraisalTenorMonths" integer DEFAULT 12;')
    cur.execute('ALTER TABLE "Collaterals" ADD COLUMN IF NOT EXISTS "AppraisalExpiryDate" text;')
    conn.commit()
    print("SUCCESS: Added AppraisalTenorMonths and AppraisalExpiryDate columns to Collaterals table")
except Exception as e:
    conn.rollback()
    print("ERROR adding columns:", e)

conn.close()
