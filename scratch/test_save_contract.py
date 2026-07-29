import psycopg2

conn = psycopg2.connect("postgres://postgres:Congbang1902%40@db.xkzntlaybrjlkcymqius.supabase.co:5432/postgres")
cur = conn.cursor()

# Get customer
cur.execute('SELECT "Id", "CifKh" FROM "Customers" LIMIT 5;')
cus = cur.fetchall()

if cus:
    cid = cus[0][0]
    print(f"Testing insert with ContractType=0 for customer Id={cid}")
    try:
        cur.execute("""
            INSERT INTO "LoanContracts" (
                "Id", "CustomerId", "ContractType", "ContractNumber", "LoanMethod", "ContractAmount", "LoanAmount", "CurrentBalance",
                "ContractStartDate", "ContractEndDate", "DisbursementDate", "KunnDueDate", "KunnTenor",
                "PrincipalRepaymentMethod", "InterestRepaymentMethod", "DebtGroup", "IsSettled", "IsRestructured"
            ) VALUES (
                1001, %s, 0, 'HDTD-TEST-001', 'Hạn mức tín dụng', 1000000000, 200000000, 200000000,
                '2026-05-05', '2027-05-05', '2026-05-05', '2026-10-05', '5 tháng',
                'Gốc trả cuối kỳ', 'Lãi trả hàng tháng theo dư nợ thực tế', 1, false, false
            ) RETURNING "Id";
        """, (cid,))
        inserted_id = cur.fetchone()[0]
        conn.commit()
        print("SUCCESS! Inserted contract Id:", inserted_id)
    except Exception as e:
        conn.rollback()
        print("INSERT ERROR:", type(e), e)

# Also check max Id
cur.execute('SELECT MAX("Id") FROM "LoanContracts";')
print("MAX Id in LoanContracts:", cur.fetchone()[0])

conn.close()
