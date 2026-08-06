-- Thẻ tín dụng bảo đảm bằng TSĐB phải chịu cùng trần LTV với khoản vay.
-- Khi banker cấp vượt trần thì phải là ngoại lệ có phê duyệt, và dấu vết đó
-- cần một cột riêng — không nhét vào Note (xem CONVENTIONS.md §1).

ALTER TABLE "CreditCards"
  ADD COLUMN IF NOT EXISTS "IsLtvException" boolean NOT NULL DEFAULT false;

ALTER TABLE "CreditCards"
  ADD COLUMN IF NOT EXISTS "LtvExceptionReason" text;

COMMENT ON COLUMN "CreditCards"."IsLtvException" IS
  'Hạn mức thẻ vượt khả năng bảo đảm của cụm tài sản, đã được xác nhận là ngoại lệ.';

COMMENT ON COLUMN "CreditCards"."LtvExceptionReason" IS
  'Lý do banker khai khi cấp vượt trần. Bắt buộc khi IsLtvException = true.';
