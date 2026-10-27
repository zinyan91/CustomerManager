-- Chuyển khoản vay cầm cố sổ tiết kiệm đang nằm ở HĐTD/KUNN/TSBĐ sang bảng của migration 76.
-- Chạy SAU migration 76. Không xoá bản ghi cũ: chỉ đánh dấu Moved* để tầng API lọc bỏ.
--
-- Một khối DO duy nhất nên nguyên tử: mọi kiểm tra hỏng thì RAISE và không ghi dòng nào.
-- Chạy lại lần hai không tạo trùng vì chỉ lấy KUNN chưa có MovedToPledgeLoanId.
--
-- GỐC ĐÃ THU tính lại từ RepaymentSchedules bằng đúng biểu thức của view
-- "ContractPaidPrincipal" (migration 51), KHÔNG đọc view: view lọc theo
-- can_access_contract(auth.uid()), mà trong SQL Editor auth.uid() rỗng nên view trả 0 dòng.
-- Dư nợ cũ = outstandingOf trong src/lib/loanMath.ts:
--   IsSettled -> 0; có lịch -> max(0, gốc - đã thu); không lịch -> coalesce(CurrentBalance, gốc).
-- Gốc = kunnPrincipal: LoanAmount > 0, nếu không thì CurrentBalance > 0.
--
-- TSBĐ của khoản vay: lấy từ CollateralId/CollateralIds của KUNN; KUNN không khai thì lấy
-- CollateralIds của HĐTD. TSBĐ còn bảo đảm cho khoản vay KHÔNG phải cầm cố thì dừng, vì
-- đánh dấu đã chuyển sẽ làm nó biến khỏi khoản vay kia.
--
-- HĐTD cầm cố chưa có KUNN nào thì KHÔNG chuyển: chưa giải ngân nên không có dư nợ;
-- tạo khoản vay từ HĐTD sẽ đẻ ra dư nợ không có thật.

DO $$
DECLARE
  c_cam_co   CONSTANT text := 'Cầm cố sổ tiết kiệm';
  v_bad      text;
  v_shared   text;
  v_src      record;
  v_loan_id  bigint;
  v_book_ids bigint[];
  v_total    numeric;
  v_given    numeric;
  v_share    numeric;
  v_i        int;
  v_n_src    int;
  v_n_new    int;
  v_sum_src  numeric;
  v_sum_new  numeric;
  v_out_src  numeric;
  v_out_new  numeric;
BEGIN
  CREATE TEMP TABLE _src ON COMMIT DROP AS
  WITH base AS (
    SELECT
      k."Id"               AS kunn_id,
      k."CustomerId"       AS customer_id,
      k."CreditContractId" AS credit_id,
      btrim(k."ContractNumber") AS contract_number,
      CASE WHEN coalesce(k."LoanAmount", 0) > 0 THEN k."LoanAmount"
           WHEN coalesce(k."CurrentBalance", 0) > 0 THEN k."CurrentBalance"
           ELSE 0 END AS principal,
      k."CurrentBalance"   AS current_balance,
      coalesce(k."IsSettled", false) AS settled,
      k."SettledDate"      AS settled_date,
      coalesce(k."InterestRate", k."NormalRate", c."InterestRate", c."NormalRate") AS raw_rate,
      coalesce(nullif(k."DisbursementDate"::text, '')::date, nullif(k."ContractStartDate"::text, '')::date) AS disb,
      coalesce(nullif(k."KunnDueDate"::text, '')::date, nullif(k."ContractEndDate"::text, '')::date) AS due,
      (SELECT sum(CASE
                    WHEN coalesce(s."ActualPaidPrincipal", 0) > 0
                      THEN coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."PrepaidPrincipalAmount", 0)
                    WHEN coalesce(s."IsPaid", false) THEN coalesce(s."PrincipalAmount", 0)
                    ELSE coalesce(s."PrepaidPrincipalAmount", 0)
                  END)
         FROM "RepaymentSchedules" s WHERE s."ContractId" = k."Id") AS paid,
      k."CollateralId"     AS kunn_collateral_id,
      k."CollateralIds"    AS kunn_collateral_ids,
      c."CollateralIds"    AS credit_collateral_ids
    FROM "LoanContracts" k
    LEFT JOIN "CreditContracts" c ON c."Id" = k."CreditContractId"
    WHERE (k."LoanMethod" = c_cam_co OR c."LoanMethod" = c_cam_co)
      AND k."MovedToPledgeLoanId" IS NULL
  )
  SELECT b.*,
    CASE WHEN b.raw_rate IS NULL THEN NULL WHEN b.raw_rate <= 1 THEN b.raw_rate * 100 ELSE b.raw_rate END AS rate_percent,
    CASE WHEN b.settled THEN 0
         WHEN b.paid IS NOT NULL THEN greatest(0, b.principal - b.paid)
         ELSE coalesce(b.current_balance, b.principal) END AS legacy_outstanding
  FROM base b;

  SELECT string_agg(contract_number, ', ' ORDER BY contract_number) INTO v_bad
  FROM _src
  WHERE principal <= 0 OR rate_percent IS NULL OR disb IS NULL OR due IS NULL OR due <= disb
     OR legacy_outstanding > principal;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Không chuyển được: KUNN thiếu số tiền, lãi suất, ngày giải ngân/đến hạn, hoặc dư nợ lớn hơn số tiền vay: %. Sửa ở màn Khoản vay rồi chạy lại.', v_bad;
  END IF;

  CREATE TEMP TABLE _col ON COMMIT DROP AS
  SELECT DISTINCT s.kunn_id, col."Id" AS collateral_id
  FROM _src s
  CROSS JOIN LATERAL (
    SELECT s.kunn_collateral_id AS id WHERE s.kunn_collateral_id IS NOT NULL
    UNION
    SELECT nullif(x, '')::bigint FROM regexp_split_to_table(coalesce(s.kunn_collateral_ids, ''), '[^0-9]+') AS x
  ) own
  JOIN "Collaterals" col ON col."Id" = own.id AND col."CustomerId" = s.customer_id
  WHERE own.id IS NOT NULL;

  INSERT INTO _col
  SELECT DISTINCT s.kunn_id, col."Id"
  FROM _src s
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(s.credit_collateral_ids, ''), '[^0-9]+') AS x
  JOIN "Collaterals" col ON col."Id" = nullif(x, '')::bigint AND col."CustomerId" = s.customer_id
  WHERE NOT EXISTS (SELECT 1 FROM _col c WHERE c.kunn_id = s.kunn_id);

  SELECT string_agg(DISTINCT c.collateral_id::text, ', ') INTO v_shared
  FROM _col c
  WHERE EXISTS (
      SELECT 1 FROM "LoanContracts" k
      LEFT JOIN "CreditContracts" cc ON cc."Id" = k."CreditContractId"
      WHERE k."Id" NOT IN (SELECT kunn_id FROM _src)
        AND coalesce(k."LoanMethod", '') <> c_cam_co AND coalesce(cc."LoanMethod", '') <> c_cam_co
        AND (k."CollateralId" = c.collateral_id
             OR c.collateral_id::text = ANY (regexp_split_to_array(coalesce(k."CollateralIds", ''), '[^0-9]+')))
    )
    OR EXISTS (
      SELECT 1 FROM "CreditContracts" cc
      WHERE coalesce(cc."LoanMethod", '') <> c_cam_co
        AND c.collateral_id::text = ANY (regexp_split_to_array(coalesce(cc."CollateralIds", ''), '[^0-9]+'))
    );
  IF v_shared IS NOT NULL THEN
    RAISE EXCEPTION 'Không chuyển được: TSBĐ Id % còn bảo đảm cho khoản vay không phải cầm cố. Tách TSBĐ đó ra trước rồi chạy lại.', v_shared;
  END IF;

  SELECT string_agg(DISTINCT col."Id"::text, ', ') INTO v_bad
  FROM _col c JOIN "Collaterals" col ON col."Id" = c.collateral_id
  WHERE coalesce(col."Value", col."AppraisedValue", 0) <= 0
    AND NOT EXISTS (SELECT 1 FROM "SavingsBooks" b WHERE b."MovedFromCollateralId" = col."Id");
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Không chuyển được: TSBĐ Id % chưa có giá trị sổ. Nhập giá trị ở màn Định giá TSĐB rồi chạy lại.', v_bad;
  END IF;

  INSERT INTO "SavingsBooks" ("CustomerId", "BookNumber", "DepositType", "Currency", "Amount", "MovedFromCollateralId", "Note")
  SELECT col."CustomerId",
         coalesce(nullif(btrim(col."AssetCode"), ''), 'TSBD-' || col."Id"),
         'tg_vnd', 'VND',
         coalesce(col."Value", col."AppraisedValue"),
         col."Id",
         col."Note"
  FROM "Collaterals" col
  WHERE col."Id" IN (SELECT collateral_id FROM _col)
    AND NOT EXISTS (SELECT 1 FROM "SavingsBooks" b WHERE b."MovedFromCollateralId" = col."Id");

  UPDATE "Collaterals" col SET "MovedToSavingsBookId" = b."Id"
  FROM "SavingsBooks" b
  WHERE b."MovedFromCollateralId" = col."Id" AND col."Id" IN (SELECT collateral_id FROM _col);

  FOR v_src IN SELECT * FROM _src ORDER BY kunn_id LOOP
    INSERT INTO "PledgeLoans" ("CustomerId", "ContractNumber", "Amount", "InterestRate", "DisbursementDate", "DueDate",
                               "IsClosed", "ClosedDate", "ClosedHow", "LegacyCreditContractId", "LegacyLoanContractId", "Note")
    VALUES (v_src.customer_id, v_src.contract_number, v_src.principal, v_src.rate_percent, v_src.disb, v_src.due,
            v_src.legacy_outstanding = 0,
            CASE WHEN v_src.legacy_outstanding = 0
                 THEN coalesce(v_src.settled_date, greatest(v_src.disb, least(current_date, v_src.due))) END,
            CASE WHEN v_src.legacy_outstanding = 0 THEN 'full' END,
            v_src.credit_id, v_src.kunn_id, 'Chuyển từ KUNN')
    RETURNING "Id" INTO v_loan_id;

    UPDATE "LoanContracts" SET "MovedToPledgeLoanId" = v_loan_id WHERE "Id" = v_src.kunn_id;

    SELECT array_agg(b."Id" ORDER BY b."Id"), sum(b."Amount")
      INTO v_book_ids, v_total
    FROM _col c JOIN "SavingsBooks" b ON b."MovedFromCollateralId" = c.collateral_id
    WHERE c.kunn_id = v_src.kunn_id;

    IF v_book_ids IS NOT NULL THEN
      v_given := 0;
      FOR v_i IN 1 .. array_length(v_book_ids, 1) LOOP
        IF v_i = array_length(v_book_ids, 1) THEN
          v_share := v_src.principal - v_given;
        ELSE
          SELECT floor(v_src.principal * b."Amount" / v_total) INTO v_share FROM "SavingsBooks" b WHERE b."Id" = v_book_ids[v_i];
        END IF;
        v_given := v_given + v_share;
        INSERT INTO "PledgeLoanSavingsBooks" ("PledgeLoanId", "SavingsBookId", "PrincipalCovered", "ReleasedDate", "Note")
        VALUES (v_loan_id, v_book_ids[v_i], v_share,
                CASE WHEN v_src.legacy_outstanding = 0
                     THEN coalesce(v_src.settled_date, greatest(v_src.disb, least(current_date, v_src.due))) END,
                CASE WHEN array_length(v_book_ids, 1) > 1 THEN 'Chia tự động khi chuyển, cần kiểm lại' END);
      END LOOP;
    END IF;

    IF v_src.legacy_outstanding < v_src.principal THEN
      INSERT INTO "PledgeLoanRepayments" ("PledgeLoanId", "RepaymentDate", "Kind", "PrincipalPaid", "Note")
      VALUES (v_loan_id,
              coalesce(CASE WHEN v_src.legacy_outstanding = 0 THEN v_src.settled_date END,
                       greatest(v_src.disb, least(current_date, v_src.due))),
              CASE WHEN v_src.legacy_outstanding = 0 THEN 'full' ELSE 'partial' END,
              v_src.principal - v_src.legacy_outstanding,
              'Chuyển từ KUNN: gốc đã thu trước khi chuyển');
    END IF;
  END LOOP;

  UPDATE "CreditContracts" cc SET "MovedToPledgeLoanId" = m.loan_id
  FROM (
    SELECT k."CreditContractId" AS credit_id, min(k."MovedToPledgeLoanId") AS loan_id
    FROM "LoanContracts" k
    WHERE k."CreditContractId" IS NOT NULL
    GROUP BY k."CreditContractId"
    HAVING bool_and(k."MovedToPledgeLoanId" IS NOT NULL)
  ) m
  WHERE cc."Id" = m.credit_id AND cc."LoanMethod" = c_cam_co AND cc."MovedToPledgeLoanId" IS NULL;

  SELECT count(*), coalesce(sum(principal), 0), coalesce(sum(legacy_outstanding), 0)
    INTO v_n_src, v_sum_src, v_out_src FROM _src;
  SELECT count(*), coalesce(sum(l."Amount"), 0),
         coalesce(sum(l."Amount" - coalesce((SELECT sum(r."PrincipalPaid") FROM "PledgeLoanRepayments" r WHERE r."PledgeLoanId" = l."Id"), 0)), 0)
    INTO v_n_new, v_sum_new, v_out_new
  FROM "PledgeLoans" l WHERE l."LegacyLoanContractId" IN (SELECT kunn_id FROM _src);

  IF v_n_src <> v_n_new OR v_sum_src <> v_sum_new OR v_out_src <> v_out_new THEN
    RAISE EXCEPTION 'Đối soát lệch: nguồn % khoản, tổng % / dư nợ %; đích % khoản, tổng % / dư nợ %. Không ghi gì.',
      v_n_src, v_sum_src, v_out_src, v_n_new, v_sum_new, v_out_new;
  END IF;

  RAISE NOTICE 'Đã chuyển % khoản vay cầm cố, tổng số tiền %, tổng dư nợ %.', v_n_new, v_sum_new, v_out_new;
END;
$$;
