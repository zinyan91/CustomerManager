-- Gỡ migration 65: trả các bảng về chính sách trước đó. Không xóa bảng UserModules (giữ dữ liệu cờ).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname IN ('mod_credit', 'mod_dispatch', 'mod_inventory', 'mod_quiz', 'mod_rates', 'mod_storage', 'mod_hf_config')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
