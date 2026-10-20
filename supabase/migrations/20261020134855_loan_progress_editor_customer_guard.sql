BEGIN;
CREATE OR REPLACE FUNCTION app_team.guard_progress()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW."Id" IS DISTINCT FROM OLD."Id" OR NEW."OwnerId" IS DISTINCT FROM OLD."OwnerId"
      OR NEW."CreatedAt" IS DISTINCT FROM OLD."CreatedAt" THEN
      RAISE EXCEPTION 'Không được thay đổi mã, chủ sở hữu hoặc ngày tạo hồ sơ.';
    END IF;
    NEW."Version" := OLD."Version"+1;
  ELSE
    NEW."Version" := 1;
    NEW."CreatedAt" := statement_timestamp();
  END IF;
  NEW."UpdatedAt" := statement_timestamp();
  IF TG_OP='UPDATE' AND NEW."CustomerKind"='existing' AND OLD."CustomerKind"='existing'
    AND NEW."CustomerId" IS NOT DISTINCT FROM OLD."CustomerId" THEN
    NEW."CustomerName" := OLD."CustomerName";
  ELSIF NEW."CustomerKind"='existing' THEN
    SELECT c."FullName" INTO NEW."CustomerName" FROM public."Customers" c
      WHERE c."Id"=NEW."CustomerId" AND c."OwnerId"=(SELECT auth.uid());
    IF NOT FOUND THEN RAISE EXCEPTION 'Khách hàng hiện hữu không thuộc người nhập.'; END IF;
  ELSE
    NEW."CustomerName" := btrim(NEW."CustomerName");
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;