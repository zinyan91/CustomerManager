-- Gỡ migration 66: bỏ ba hàm chuyển giao. Giữ bảng CustomerTransfers (nhật ký) và không hoàn tác các lần đã chuyển.
DROP FUNCTION IF EXISTS public.transfer_customers(uuid, uuid, integer[]);
DROP FUNCTION IF EXISTS public.customer_transfer_preview(uuid, integer[]);
DROP FUNCTION IF EXISTS public.customer_transfer_counts(integer[], uuid);
