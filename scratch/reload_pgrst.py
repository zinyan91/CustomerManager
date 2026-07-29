import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

try:
    cur.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    print("SUCCESS: Reloaded PostgREST schema cache")
except Exception as e:
    conn.rollback()
    print("ERROR:", e)

conn.close()
