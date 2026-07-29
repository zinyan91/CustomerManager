import urllib.request
import json
import psycopg2

# Get valid JWT secret / anon key from db if stored in auth/config or env
# Let's test generating a valid JWT using python PyJWT or hmac!
import base64
import hmac
import hashlib

# Default Supabase JWT secret for local or inspect database pg_settings
conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

cur.execute("SELECT name, setting FROM pg_settings WHERE name LIKE '%jwt%' OR name LIKE '%auth%';")
for r in cur.fetchall():
    print(r)

conn.close()
