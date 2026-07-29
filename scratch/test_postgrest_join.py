import urllib.request
import json

anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrebnRsYXlicmpsa2N5bXFpdXMiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczODE0ODcyNywiZXhwIjoyMDUzNzI0NzI3fQ.7i5Wc9eFv8Q3O3X5pX5W7V7_X_W_W_W_W_W_W_W"

# Test 1: select=*
URL1 = "https://xkzntlaybrjlkcymqius.supabase.co/rest/v1/LoanContracts?select=*&CustomerId=eq.5"
req1 = urllib.request.Request(URL1)
req1.add_header("apikey", anon_key)
req1.add_header("Authorization", f"Bearer {anon_key}")

try:
    with urllib.request.urlopen(req1) as resp:
        res1 = json.loads(resp.read().decode('utf-8'))
        print(f"Test 1 (select=*): SUCCESS, returned {len(res1)} rows")
except Exception as e:
    print("Test 1 ERROR:", e)

# Test 2: select=*,customer:Customers(*),collateral:Collaterals(*)
URL2 = "https://xkzntlaybrjlkcymqius.supabase.co/rest/v1/LoanContracts?select=*,customer:Customers(*),collateral:Collaterals(*)&CustomerId=eq.5"
req2 = urllib.request.Request(URL2)
req2.add_header("apikey", anon_key)
req2.add_header("Authorization", f"Bearer {anon_key}")

try:
    with urllib.request.urlopen(req2) as resp:
        res2 = json.loads(resp.read().decode('utf-8'))
        print(f"Test 2 (with joins): SUCCESS, returned {len(res2)} rows")
except Exception as e:
    print("Test 2 ERROR:", e)
