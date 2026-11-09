-- 80_inventory_debt_items.sql
-- Lưu công nợ phải thu (TK 131) và phải trả (TK 331) của màn Hàng tồn kho, gom theo ngành hàng như "InventoryItems".
-- Từ 30/10/2026 bảng mới trong public không tự được GRANT, nên cấp quyền ngay trong migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public."InventoryDebtItems" (
  "Id"              text PRIMARY KEY,
  "Kind"            text NOT NULL CHECK ("Kind" IN ('receivable', 'payable')),
  "CategoryName"    text NOT NULL,
  "Code"            text NOT NULL DEFAULT '',
  "Name"            text NOT NULL DEFAULT '',
  "BeginningDebit"  numeric NOT NULL DEFAULT 0 CHECK ("BeginningDebit" >= 0),
  "BeginningCredit" numeric NOT NULL DEFAULT 0 CHECK ("BeginningCredit" >= 0),
  "OccurredDebit"   numeric NOT NULL DEFAULT 0 CHECK ("OccurredDebit" >= 0),
  "OccurredCredit"  numeric NOT NULL DEFAULT 0 CHECK ("OccurredCredit" >= 0),
  "CreatedAt"       timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt"       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_debt_items_category_kind
  ON public."InventoryDebtItems" ("CategoryName", "Kind", "CreatedAt");

GRANT SELECT, INSERT, UPDATE, DELETE ON public."InventoryDebtItems" TO authenticated, service_role;

ALTER TABLE public."InventoryDebtItems" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_debt_items_select" ON public."InventoryDebtItems";
CREATE POLICY "inventory_debt_items_select" ON public."InventoryDebtItems"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_debt_items_insert" ON public."InventoryDebtItems";
CREATE POLICY "inventory_debt_items_insert" ON public."InventoryDebtItems"
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_debt_items_update" ON public."InventoryDebtItems";
CREATE POLICY "inventory_debt_items_update" ON public."InventoryDebtItems"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_debt_items_delete" ON public."InventoryDebtItems";
CREATE POLICY "inventory_debt_items_delete" ON public."InventoryDebtItems"
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "mod_inventory" ON public."InventoryDebtItems";
CREATE POLICY "mod_inventory" ON public."InventoryDebtItems"
  AS RESTRICTIVE FOR ALL USING ((SELECT public.has_module('inventory')));

COMMIT;
