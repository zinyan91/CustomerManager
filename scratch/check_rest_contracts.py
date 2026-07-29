import urllib.request
import json
import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

# Get customer 005391337
cur.execute('SELECT "Id", "CifKh" FROM "Customers" WHERE "CifKh" = \'005391337\';')
cus = cur.fetchone()
print("Customer:", cus)

if cus:
    cid = cus[0]
    cur.execute('SELECT "Id", "CustomerId", "ContractNumber" FROM "LoanContracts" WHERE "CustomerId" = %s;', (cid,))
    cons = cur.fetchall()
    print(f"\nContracts in DB for CustomerId={cid}: count={len(cons)}")
    for c in cons:
        print(c[0], c[1], c[2])

# Read anon key from web/src/lib/supabase.ts
with open("web/src/lib/supabase.ts", "r") as f:
    text = f.read()

anon_key = ""
for line in text.split("\n"):
    if "VITE_SUPABASE_ANON_KEY" in line or "supabaseAnonKey" in line or "const" in line:
        if "=" in line and ("eyJ" in line or "sbp_" in line):
            anon_key = line.split("=")[1].strip().strip("'").strip('"').strip(";")

print("Using anon_key:", anon_key[:20] + "...")

URL = f"https://xkzntlaybrjlkcymqius.supabase.co/rest/v1/LoanContracts?select=*,customer:Customers(*)&CustomerId=eq.5"
req = urllib.request.Request(URL)
req.add_header("apikey", anon_key)
req.add_header("Authorization", f"Bearer {anon_key}")

try:
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        print(f"\nREST API returned {len(res_data)} contracts for CustomerId=5:")
        for r in res_data:
            print(r.get("Id"), r.get("ContractNumber"), r.get("CustomerId"))
except Exception as e:
    print("\nREST API ERROR:", e)

conn.close()
