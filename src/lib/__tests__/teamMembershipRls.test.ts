import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261020103219_team_membership_read_scope.sql', 'utf8');
const statementTimeMigration = readFileSync('supabase/migrations/20261020110208_team_membership_statement_time.sql', 'utf8');
const kpiTargetsMigration = readFileSync('supabase/migrations/20261020111441_team_kpi_period_targets.sql', 'utf8');
const kpiImportMigration = readFileSync('supabase/migrations/20261020112341_team_kpi_observation_import.sql', 'utf8');
const kpiCloseMigration = readFileSync('supabase/migrations/20261020113521_team_kpi_period_close.sql', 'utf8');
const requestScopeMigration = readFileSync('supabase/migrations/20261020115051_team_read_request_scope.sql', 'utf8');
const ids = {
  master: '00000000-0000-4000-8000-000000000001',
  leader: '00000000-0000-4000-8000-000000000002',
  member: '00000000-0000-4000-8000-000000000003',
  outsider: '00000000-0000-4000-8000-000000000004',
  solo: '00000000-0000-4000-8000-000000000005',
  userAdmin: '00000000-0000-4000-8000-000000000006',
};
const teamA = '10000000-0000-4000-8000-000000000001';
const teamB = '10000000-0000-4000-8000-000000000002';
let db: PGlite;

async function actor(id: string) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [id]);
  await db.query(`SELECT set_config('request.headers','{"x-team-read":"1"}',false)`);
  await db.exec('SET ROLE authenticated');
}

async function customerIds() {
  return (await db.query<{ Id: number }>('SELECT "Id" FROM public."Customers" ORDER BY "Id"')).rows.map(row => row.Id);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, banned_until timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    CREATE TABLE public."UserRoles" ("UserId" uuid PRIMARY KEY, "Role" text, "FullName" text);
    CREATE TABLE public."TestModuleAccess" ("UserId" uuid PRIMARY KEY, allowed boolean NOT NULL);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
      $$ SELECT EXISTS(SELECT 1 FROM public."UserRoles" WHERE "UserId"=auth.uid() AND "Role" IN ('master_admin','user_admin')) $$;
    CREATE FUNCTION public.is_master_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
      $$ SELECT EXISTS(SELECT 1 FROM public."UserRoles" WHERE "UserId"=auth.uid() AND "Role"='master_admin') $$;
    CREATE FUNCTION public.has_module(m text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
      $$ SELECT auth.uid() IS NOT NULL AND coalesce((SELECT allowed FROM public."TestModuleAccess" WHERE "UserId"=auth.uid()), true) $$;
    CREATE TABLE public."Customers" ("Id" bigint PRIMARY KEY, "OwnerId" uuid, "FullName" text);
    CREATE FUNCTION public.can_access_customer(cid bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
      $$ SELECT public.is_admin() OR EXISTS(SELECT 1 FROM public."Customers" WHERE "Id"=cid AND "OwnerId"=auth.uid()) $$;
    CREATE TABLE public."LoanContracts" ("Id" bigint PRIMARY KEY, "CustomerId" bigint REFERENCES public."Customers", value text);
    CREATE TABLE public."RepaymentSchedules" ("Id" bigint PRIMARY KEY, "ContractId" bigint REFERENCES public."LoanContracts", value text);
    CREATE TABLE public."CardContracts" ("Id" bigint PRIMARY KEY, "CustomerId" bigint REFERENCES public."Customers", value text);
    CREATE TABLE public."CardSupplementaryHolders" ("Id" bigint PRIMARY KEY, "CardContractId" bigint REFERENCES public."CardContracts", value text);
    CREATE TABLE public."CollateralAppraisals" ("Id" bigint PRIMARY KEY, "CollateralId" bigint, value text);
    CREATE TABLE public."Collaterals" ("Id" bigint PRIMARY KEY, "CustomerId" bigint REFERENCES public."Customers", value text);
    CREATE TABLE public."CreditContracts" ("Id" bigint PRIMARY KEY, "CustomerId" bigint REFERENCES public."Customers", value text);
    CREATE TABLE public."MortgageContracts" ("Id" bigint PRIMARY KEY, "CustomerId" bigint REFERENCES public."Customers", value text);
    CREATE TABLE public."PostLoanControlRecords" ("Id" bigint PRIMARY KEY, "CustomerId" bigint REFERENCES public."Customers", value text);
    CREATE TABLE public."MortgageContractCollaterals" ("Id" bigint PRIMARY KEY, "MortgageContractId" bigint REFERENCES public."MortgageContracts", value text);
    CREATE TABLE public."MortgageContractCreditContracts" ("Id" bigint PRIMARY KEY, "MortgageContractId" bigint REFERENCES public."MortgageContracts", value text);
    CREATE TABLE public."ContractCollaterals" ("Id" bigint PRIMARY KEY, "ContractId" bigint REFERENCES public."LoanContracts", value text);
    ALTER TABLE public."UserRoles" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY roles_self ON public."UserRoles" FOR SELECT TO authenticated USING ("UserId"=auth.uid() OR public.is_admin());
    ALTER TABLE public."Customers" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY customer_owner ON public."Customers" FOR ALL TO authenticated USING (public.is_admin() OR "OwnerId"=auth.uid()) WITH CHECK (public.is_admin() OR "OwnerId"=auth.uid());
  `);
  for (const table of ['LoanContracts', 'CardContracts', 'Collaterals', 'CreditContracts', 'MortgageContracts', 'PostLoanControlRecords']) {
    await db.exec(`
      ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY owner_write ON public."${table}" FOR ALL TO authenticated
        USING (public.can_access_customer("CustomerId")) WITH CHECK (public.can_access_customer("CustomerId"));
    `);
  }
  for (const [table, predicate] of [
    ['RepaymentSchedules', 'EXISTS(SELECT 1 FROM public."LoanContracts" c WHERE c."Id"="ContractId" AND public.can_access_customer(c."CustomerId"))'],
    ['CardSupplementaryHolders', 'EXISTS(SELECT 1 FROM public."CardContracts" c WHERE c."Id"="CardContractId" AND public.can_access_customer(c."CustomerId"))'],
    ['CollateralAppraisals', 'EXISTS(SELECT 1 FROM public."Collaterals" c WHERE c."Id"="CollateralId" AND public.can_access_customer(c."CustomerId"))'],
    ['MortgageContractCollaterals', 'EXISTS(SELECT 1 FROM public."MortgageContracts" c WHERE c."Id"="MortgageContractId" AND public.can_access_customer(c."CustomerId"))'],
    ['MortgageContractCreditContracts', 'EXISTS(SELECT 1 FROM public."MortgageContracts" c WHERE c."Id"="MortgageContractId" AND public.can_access_customer(c."CustomerId"))'],
    ['ContractCollaterals', 'EXISTS(SELECT 1 FROM public."LoanContracts" c WHERE c."Id"="ContractId" AND public.can_access_customer(c."CustomerId"))'],
  ]) {
    await db.exec(`
      ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;
      CREATE POLICY owner_write ON public."${table}" FOR ALL TO authenticated USING (${predicate}) WITH CHECK (${predicate});
    `);
  }
  for (const table of ['Customers', 'LoanContracts', 'RepaymentSchedules', 'CardContracts', 'CardSupplementaryHolders', 'Collaterals', 'CollateralAppraisals',
    'CreditContracts', 'MortgageContracts', 'PostLoanControlRecords', 'MortgageContractCollaterals', 'MortgageContractCreditContracts', 'ContractCollaterals']) {
    await db.exec(`GRANT SELECT,INSERT,UPDATE,DELETE ON public."${table}" TO authenticated;
      CREATE POLICY module_credit ON public."${table}" AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_module('credit')) WITH CHECK (public.has_module('credit'));`);
  }
  await db.exec(`GRANT SELECT ON public."UserRoles" TO authenticated;
    INSERT INTO auth.users(id) VALUES ${Object.values(ids).map(id => `('${id}')`).join(',')};
    INSERT INTO public."UserRoles" VALUES ${Object.entries(ids).map(([role, id]) => `('${id}','${role === 'master' ? 'master_admin' : role === 'userAdmin' ? 'user_admin' : 'user'}','${role}')`).join(',')};
    INSERT INTO public."Customers" VALUES
      (101,'${ids.leader}','Leader own'),(102,'${ids.member}','Member own'),
      (103,'${ids.outsider}','Outside team'),(104,NULL,'Unassigned'),(105,'${ids.solo}','No team');
    INSERT INTO public."LoanContracts" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c');
    INSERT INTO public."RepaymentSchedules" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c');
    INSERT INTO public."CardContracts" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c');
    INSERT INTO public."CardSupplementaryHolders" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c');
    INSERT INTO public."Collaterals" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c');
    INSERT INTO public."CollateralAppraisals" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c');
  `);
  await db.exec(migration);
  await db.exec(statementTimeMigration);
  await db.exec(kpiTargetsMigration);
  await db.exec(kpiImportMigration);
  await db.exec(kpiCloseMigration);
  await db.exec(requestScopeMigration);
  await db.exec(`
    INSERT INTO public."Teams" ("Id","Name") VALUES ('${teamA}','Team A'),('${teamB}','Team B');
    INSERT INTO public."TeamMemberships" ("TeamId","UserId","TeamRole","EffectiveFrom","ChangeReason") VALUES
      ('${teamA}','${ids.leader}','leader',now()-interval '1 month','Initial'),
      ('${teamA}','${ids.member}','member',now()-interval '1 month','Initial'),
      ('${teamB}','${ids.outsider}','leader',now()-interval '1 month','Initial');
  `);
  for (const table of ['CreditContracts', 'MortgageContracts', 'PostLoanControlRecords', 'MortgageContractCollaterals',
    'MortgageContractCreditContracts', 'ContractCollaterals']) {
    await db.exec(`INSERT INTO public."${table}" VALUES (101,101,'a'),(102,102,'b'),(103,103,'c')`);
  }
}, 120_000);

beforeEach(async () => { await db.exec('RESET ROLE; BEGIN'); });
afterEach(async () => { await db.exec('ROLLBACK; RESET ROLE'); });
afterAll(async () => { await db?.close(); });

describe('team membership and SELECT-only access', () => {
  it.each([ids.leader,ids.userAdmin])('does not grant team creation to non-Master account %s', async id => {
    await actor(id);
    await expect(db.query(`INSERT INTO public."Teams" ("Name") VALUES ('Forbidden')`)).rejects.toThrow(/row-level security/);
  });
  it('keeps older Dashboard requests restricted to own data without the Team read header', async () => {
    await actor(ids.leader);
    await db.query(`SELECT set_config('request.headers','{}',false)`);
    expect(await customerIds()).toEqual([101]);
  });
  it('leader reads own and current team customers, not another team or unassigned', async () => {
    await actor(ids.leader);
    expect(await customerIds()).toEqual([101, 102]);
    for (const table of ['LoanContracts', 'RepaymentSchedules', 'CardContracts', 'CardSupplementaryHolders', 'Collaterals', 'CollateralAppraisals',
      'CreditContracts', 'MortgageContracts', 'PostLoanControlRecords', 'MortgageContractCollaterals', 'MortgageContractCreditContracts', 'ContractCollaterals']) {
      expect((await db.query(`SELECT "Id" FROM public."${table}" ORDER BY "Id"`)).rows).toEqual([{ Id: 101 }, { Id: 102 }]);
      expect((await db.query(`UPDATE public."${table}" SET value='unauthorized' WHERE "Id"=102`)).affectedRows).toBe(0);
      expect((await db.query(`DELETE FROM public."${table}" WHERE "Id"=102`)).affectedRows).toBe(0);
    }
  });
  it('members and users with no team keep access only to their own portfolio', async () => {
    await actor(ids.member);
    expect(await customerIds()).toEqual([102]);
    expect((await db.query(`SELECT * FROM public."TeamMemberships"`)).rows).toHaveLength(1);
    await actor(ids.solo);
    expect(await customerIds()).toEqual([105]);
  });
  it('leader still edits own record while another member cannot be updated or deleted', async () => {
    await actor(ids.leader);
    expect((await db.query(`UPDATE public."Customers" SET "FullName"='own' WHERE "Id"=101`)).affectedRows).toBe(1);
    expect((await db.query(`UPDATE public."Customers" SET "FullName"='bad' WHERE "Id"=102`)).affectedRows).toBe(0);
    expect((await db.query(`DELETE FROM public."Customers" WHERE "Id"=102`)).affectedRows).toBe(0);
    expect((await db.query(`UPDATE public."RepaymentSchedules" SET value='bad' WHERE "Id"=102`)).affectedRows).toBe(0);
    expect((await db.query(`UPDATE public."LoanContracts" SET value='bad' WHERE "Id"=102`)).affectedRows).toBe(0);
  });
  it('leader cannot insert child data for someone else', async () => {
    await actor(ids.leader);
    await expect(db.query(`INSERT INTO public."LoanContracts" VALUES (999,102,'bad')`)).rejects.toThrow(/row-level security/);
  });
  it('directory is scoped and does not open UserRoles of teammates', async () => {
    await actor(ids.leader);
    const directory = await db.query(`SELECT * FROM public.team_member_directory('${teamA}')`);
    expect(directory.rows).toHaveLength(2);
    expect((await db.query(`SELECT * FROM public."UserRoles"`)).rows).toHaveLength(1);
  });
  it('directory denies a different team', async () => {
    await actor(ids.leader);
    await expect(db.query(`SELECT * FROM public.team_member_directory('${teamB}')`)).rejects.toThrow(/quyền/);
  });
  it('module removal does not get bypassed by the extra SELECT policies', async () => {
    await db.query(`INSERT INTO public."TestModuleAccess" VALUES ($1,false)`, [ids.leader]);
    await actor(ids.leader);
    expect(await customerIds()).toEqual([]);
    expect((await db.query(`SELECT * FROM public."Teams"`)).rows).toEqual([]);
  });
  it('banned Leader cannot use team access with an old token', async () => {
    await db.query(`UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id=$1`, [ids.leader]);
    await actor(ids.leader);
    expect(await customerIds()).toEqual([101]);
    await expect(db.query(`SELECT * FROM public.team_member_directory('${teamA}')`)).rejects.toThrow(/quyền/);
  });
  it('ordinary users cannot promote themselves', async () => {
    await actor(ids.member);
    await expect(db.query(`SELECT public.assign_team_member('${teamA}','${ids.member}','leader','self')`)).rejects.toThrow(/quyền/);
  });
  it('changing Leader revokes old team access immediately and retains the old membership', async () => {
    await actor(ids.master);
    await db.query(`SELECT public.assign_team_member($1,$2,'leader','Thay Leader')`, [teamA, ids.member]);
    await actor(ids.leader);
    expect(await customerIds()).toEqual([101]);
    await actor(ids.member);
    expect(await customerIds()).toEqual([101, 102]);
    await actor(ids.master);
    expect((await db.query(`SELECT * FROM public."TeamMemberships" WHERE "UserId"=$1 AND "EffectiveTo" IS NOT NULL`, [ids.leader])).rows).toHaveLength(1);
    expect((await db.query(`SELECT * FROM public."TeamAuditLog" WHERE "ChangedBy"=$1`, [ids.master])).rows.length).toBeGreaterThan(0);
  });
  it('revokes the previous Leader inside the same SQL batch used by the Management API', async () => {
    await actor(ids.master);
    await expect(db.exec(`
      DO $$ BEGIN
        PERFORM public.assign_team_member('${teamA}','${ids.member}','leader','Same batch');
        PERFORM set_config('request.jwt.claim.sub','${ids.leader}',false);
        IF EXISTS(SELECT 1 FROM public."Customers" WHERE "Id"=102) THEN
          RAISE EXCEPTION 'Former Leader still reads member customer in the same batch';
        END IF;
      END $$;
    `)).resolves.toBeDefined();
  });
  it('overlapping membership in another team is rejected even on direct INSERT', async () => {
    await actor(ids.master);
    await expect(db.query(`INSERT INTO public."TeamMemberships" ("TeamId","UserId","TeamRole","ChangeReason") VALUES ($1,$2,'member','overlap')`, [teamB, ids.member])).rejects.toThrow(/chồng/);
  });
  it('membership history prevents hard deletion of an Auth user', async () => {
    await expect(db.query(`DELETE FROM auth.users WHERE id=$1`, [ids.member])).rejects.toThrow(/foreign key/);
  });
  it('User Admin keeps existing broad read access but cannot appoint a Leader', async () => {
    await actor(ids.userAdmin);
    expect(await customerIds()).toEqual([101, 102, 103, 104, 105]);
    expect((await db.query(`SELECT * FROM public.team_member_directory('${teamA}')`)).rows).toHaveLength(2);
    await expect(db.query(`SELECT public.assign_team_member('${teamA}','${ids.member}','leader','change')`)).rejects.toThrow(/quyền/);
  });
  it('a member cannot see the full team directory', async () => {
    await actor(ids.member);
    await expect(db.query(`SELECT * FROM public.team_member_directory('${teamA}')`)).rejects.toThrow(/quyền/);
  });
  it('moving a member removes access from the old Leader without changing customer ownership', async () => {
    await actor(ids.master);
    await db.query(`SELECT public.assign_team_member($1,$2,'member','Chuyển team')`, [teamB, ids.member]);
    await actor(ids.leader);
    expect(await customerIds()).toEqual([101]);
    await actor(ids.outsider);
    expect(await customerIds()).toEqual([102, 103]);
  });
  it('disabling a team withdraws Leader access to member portfolios', async () => {
    await actor(ids.master);
    await db.query(`UPDATE public."Teams" SET "IsActive"=false WHERE "Id"=$1`, [teamA]);
    await actor(ids.leader);
    expect(await customerIds()).toEqual([101]);
  });
  it('cannot move the current Leader out of an active team without a replacement', async () => {
    await actor(ids.master);
    await expect(db.query(`SELECT public.assign_team_member($1,$2,'member','Chuyển Leader')`, [teamB, ids.leader])).rejects.toThrow(/thay thế/);
  });
  it('rejects overlapping Leaders even on direct INSERT', async () => {
    await actor(ids.master);
    await expect(db.query(`INSERT INTO public."TeamMemberships" ("TeamId","UserId","TeamRole","ChangeReason") VALUES ($1,$2,'leader','another leader')`, [teamA, ids.solo])).rejects.toThrow(/Team có Leader/);
  });
  it('does not expose assignment RPC to anonymous callers', async () => {
    await db.exec('SET ROLE anon');
    await expect(db.query(`SELECT public.assign_team_member('${teamA}','${ids.solo}','leader','anonymous')`)).rejects.toThrow(/permission denied/);
  });
  it('anonymous callers cannot read teams or invoke assignment', async () => {
    await db.exec('SET ROLE anon');
    await expect(db.query(`SELECT * FROM public."Teams"`)).rejects.toThrow(/permission denied/);
  });
});

const periodA = '20000000-0000-4000-8000-000000000001';
const periodB = '20000000-0000-4000-8000-000000000002';

async function seedTargets() {
  await db.exec(`INSERT INTO public."KpiPeriods" ("Id","TeamId","Month") VALUES
    ('${periodA}','${teamA}','2026-10-01'),('${periodB}','${teamB}','2026-10-01')`);
  await actor(ids.master);
  await saveTarget(null, 100, 0);
}

const saveTarget = (user: string | null, amount: number, version: number, period = periodA, metric = 'net_loan') =>
  db.query<{ version: number }>('SELECT public.save_kpi_target($1,$2,$3,$4,$5,$6) AS version',
    [period, metric, user, amount, version, 'Giao chỉ tiêu']);

describe('KPI periods and allocation', () => {
  it('revokes anonymous RPC execution even with Supabase default function grants', async () => {
    const { rows } = await db.query<{ name: string; anon: boolean; definer: boolean }>(`
      SELECT p.proname AS name,has_function_privilege('anon',p.oid,'execute') AS anon,p.prosecdef AS definer
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('team_member_directory','assign_team_member','create_kpi_period','save_kpi_target')`);
    expect(rows).toHaveLength(4);
    for (const fn of rows) expect(fn).toMatchObject({ anon: false, definer: false });
  });
  it('only Master Admin can create a period, with its audit record', async () => {
    await actor(ids.master);
    const created = await db.query<{ id: string }>(`SELECT public.create_kpi_period($1,'2026-10-01') AS id`, [teamA]);
    expect(created.rows[0].id).toBeTruthy();
    expect((await db.query('SELECT * FROM public."KpiAuditLog"')).rows).toHaveLength(1);
  });
  it('does not let Leader create periods', async () => {
    await actor(ids.leader);
    await expect(db.query(`SELECT public.create_kpi_period($1,'2026-10-01')`, [teamA])).rejects.toThrow(/Master Admin/);
  });
  it('serializes allocations against the team budget and records revisions', async () => {
    await seedTargets();
    await actor(ids.leader);
    expect((await saveTarget(ids.leader, 40, 0)).rows[0].version).toBe(1);
    expect((await saveTarget(ids.member, 60, 0)).rows[0].version).toBe(1);
    expect((await saveTarget(ids.member, 50, 1)).rows[0].version).toBe(2);
    expect((await db.query('SELECT * FROM public."KpiAuditLog"')).rows).toHaveLength(4);
  });
  it('rejects allocation above remaining team budget', async () => {
    await seedTargets();
    await actor(ids.leader);
    await saveTarget(ids.leader, 80, 0);
    await expect(saveTarget(ids.member, 21, 0)).rejects.toThrow(/vượt ngân sách/);
  });
  it('rejects stale member versions rather than overwriting another editor', async () => {
    await seedTargets();
    await saveTarget(ids.member, 30, 0);
    await expect(saveTarget(ids.member, 40, 0)).rejects.toThrow(/đã thay đổi/);
  });
  it('rejects stale team budget versions', async () => {
    await seedTargets();
    await expect(saveTarget(null, 120, 0)).rejects.toThrow(/đã thay đổi/);
  });
  it('does not lower budget below allocations already assigned', async () => {
    await seedTargets();
    await saveTarget(ids.member, 70, 0);
    await expect(saveTarget(null, 60, 1)).rejects.toThrow(/thấp hơn/);
  });
  it('does not let Leader increase the team budget', async () => {
    await seedTargets();
    await actor(ids.leader);
    await expect(saveTarget(null, 200, 1)).rejects.toThrow(/Master Admin/);
  });
  it('does not let ordinary members allocate themselves targets', async () => {
    await seedTargets();
    await actor(ids.member);
    await expect(saveTarget(ids.member, 10, 0)).rejects.toThrow(/quyền/);
  });
  it('rejects assignment to another team or period', async () => {
    await seedTargets();
    await actor(ids.leader);
    await expect(saveTarget(ids.outsider, 10, 0)).rejects.toThrow(/thành viên/);
  });
  it('only reveals own allocations to a member and hides another team', async () => {
    await seedTargets();
    await saveTarget(ids.member, 30, 0);
    await saveTarget(ids.leader, 40, 0);
    await actor(ids.member);
    expect((await db.query('SELECT "UserId" FROM public."MemberKpiTargets"')).rows).toEqual([{ UserId: ids.member }]);
    expect((await db.query('SELECT "Id" FROM public."KpiPeriods"')).rows).toEqual([{ Id: periodA }]);
    expect((await db.query('SELECT * FROM public."KpiAuditLog"')).rows).toHaveLength(0);
  });
  it('rejects writes into a closed period', async () => {
    await seedTargets();
    await db.exec(`RESET ROLE; UPDATE public."KpiPeriods" SET "Status"='closed' WHERE "Id"='${periodA}'`);
    await actor(ids.master);
    await expect(saveTarget(null, 120, 1)).rejects.toThrow(/đã chốt/);
  });
  it('requires integer quantities', async () => {
    await seedTargets();
    await expect(saveTarget(null, 1.5, 0, periodA, 'new_customers')).rejects.toThrow(/số nguyên/);
  });
  it('keeps zero distinct from a missing target', async () => {
    await seedTargets();
    await saveTarget(null, 0, 1);
    expect((await db.query('SELECT "Amount" FROM public."TeamKpiTargets"')).rows).toEqual([{ Amount: '0.00' }]);
  });
  it('does not permit bypassing allocation checks by direct table write', async () => {
    await seedTargets();
    await expect(db.query(`UPDATE public."TeamKpiTargets" SET "Amount"=1000`)).rejects.toThrow(/permission denied/);
  });
  it('checks current account ban even when an existing token remains', async () => {
    await seedTargets();
    await db.exec(`RESET ROLE; UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id='${ids.leader}'`);
    await actor(ids.leader);
    await expect(saveTarget(ids.member, 10, 0)).rejects.toThrow(/quyền/);
  });
});

function publishRows(rows: unknown[], revision = 0, asOf = '2026-10-20') {
  return db.query<{ id: string }>('SELECT public.publish_kpi_import($1,$2,$3,$4,$5,$6) AS id',
    [periodA, revision, asOf, 'Monthly source.xlsx', 'Đối soát kỳ', JSON.stringify(rows)]);
}

describe('KPI import reconciliation and provenance', () => {
  it('keeps signed growth and does not duplicate an identical import', async () => {
    await seedTargets();
    const rows = [{ UserId: ids.member, MetricCode: 'net_loan', Amount: -25 }];
    const first = await publishRows(rows);
    const second = await publishRows(rows, 1);
    expect(first.rows).toEqual(second.rows);
    expect((await db.query('SELECT * FROM public."KpiInputBatches"')).rows).toHaveLength(1);
    expect((await db.query('SELECT "Amount" FROM public."KpiObservations"')).rows).toEqual([{ Amount: '-25.00' }]);
  });
  it('creates replacement revisions and retains prior observations unchanged', async () => {
    await seedTargets();
    await publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 25 }]);
    await publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 30 }], 1);
    expect((await db.query('SELECT "Revision" FROM public."KpiInputBatches" ORDER BY "Revision"')).rows)
      .toEqual([{ Revision: 1 }, { Revision: 2 }]);
    expect((await db.query('SELECT count(*)::integer AS n FROM public."KpiObservations"')).rows[0]).toEqual({ n: 2 });
  });
  it('rejects an import based on an out of date preview', async () => {
    await seedTargets();
    await publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 25 }]);
    await expect(publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 30 }])).rejects.toThrow(/đã thay đổi/);
  });
  it('rejects duplicate user/metric combinations', async () => {
    await seedTargets();
    const row = { UserId: ids.member, MetricCode: 'net_loan', Amount: 25 };
    await expect(publishRows([row, row])).rejects.toThrow(/Trùng/);
  });
  it('rejects users outside the team at the source date', async () => {
    await seedTargets();
    await expect(publishRows([{ UserId: ids.outsider, MetricCode: 'net_loan', Amount: 25 }])).rejects.toThrow(/không thuộc team/);
  });
  it('rejects source dates from another month', async () => {
    await seedTargets();
    await expect(publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 25 }], 0, '2026-09-30')).rejects.toThrow(/Mốc dữ liệu/);
  });
  it('checks all seven fee components, retaining the cancellation sign', async () => {
    await seedTargets();
    await publishRows([{ UserId: ids.member, MetricCode: 'service_fees', Amount: 20,
      FeeNiceNumber: 10, FeeNonLife: 10, FeeLife: 10, FeeCancellation: -10,
      FeeCredit: 0, FeeFx: 0, FeeCounterDigital: 0 }]);
    expect((await db.query('SELECT "FeeCancellation" FROM public."KpiObservations"')).rows)
      .toEqual([{ FeeCancellation: '-10.00' }]);
  });
  it('rejects a fees total that does not reconcile', async () => {
    await seedTargets();
    await expect(publishRows([{ UserId: ids.member, MetricCode: 'service_fees', Amount: 20,
      FeeNiceNumber: 0, FeeNonLife: 0, FeeLife: 0, FeeCancellation: 0,
      FeeCredit: 0, FeeFx: 0, FeeCounterDigital: 0 }])).rejects.toThrow(/Tổng phí/);
  });
  it('does not grant import permission to Leader', async () => {
    await seedTargets();
    await actor(ids.leader);
    await expect(publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 25 }])).rejects.toThrow(/Master Admin/);
  });
  it('only reveals own observations to a member', async () => {
    await seedTargets();
    await publishRows([{ UserId: ids.member, MetricCode: 'net_loan', Amount: 25 },
      { UserId: ids.leader, MetricCode: 'net_loan', Amount: 30 }]);
    await actor(ids.member);
    expect((await db.query('SELECT "UserId" FROM public."KpiObservations"')).rows).toEqual([{ UserId: ids.member }]);
  });
});

describe('period close and reopen', () => {
  it('rejects closing without a complete end-of-month source', async () => {
    await seedTargets();
    await expect(db.query(`SELECT public.set_kpi_period_status($1,'closed','Chốt kỳ')`, [periodA])).rejects.toThrow(/ngày cuối tháng/);
  });
  it('does not grant closing permission to Leader', async () => {
    await seedTargets();
    await actor(ids.leader);
    await expect(db.query(`SELECT public.set_kpi_period_status($1,'closed','Chốt kỳ')`, [periodA])).rejects.toThrow(/Master Admin/);
  });
  it('retains snapshots after reopening and prohibits member access to private snapshots', async () => {
    await seedTargets();
    await db.exec(`RESET ROLE;
      UPDATE public."KpiPeriods" SET "Month"='2026-09-01' WHERE "Id"='${periodA}';
      INSERT INTO public."TeamKpiTargets" ("PeriodId","MetricCode","Amount")
        SELECT '${periodA}',"Code",100 FROM public."KpiDefinitions" WHERE "Code"<>'net_loan';
      INSERT INTO public."MemberKpiTargets" ("PeriodId","MetricCode","UserId","Amount")
        SELECT '${periodA}',d."Code",m."UserId",10 FROM public."KpiDefinitions" d
        CROSS JOIN public."TeamMemberships" m WHERE m."TeamId"='${teamA}' AND m."EffectiveTo" IS NULL;
      INSERT INTO public."KpiInputBatches" ("Id","PeriodId","Revision","DataAsOf","SourceName","Reason","Rows","PublishedBy")
        VALUES ('30000000-0000-4000-8000-000000000001','${periodA}',1,'2026-09-30','Source','Close test',14,'${ids.master}');
      INSERT INTO public."KpiObservations" ("BatchId","UserId","MetricCode","Amount",
        "FeeNiceNumber","FeeNonLife","FeeLife","FeeCancellation","FeeCredit","FeeFx","FeeCounterDigital")
        SELECT '30000000-0000-4000-8000-000000000001',m."UserId",d."Code",0,0,0,0,0,0,0,0
        FROM public."KpiDefinitions" d CROSS JOIN public."TeamMemberships" m
        WHERE m."TeamId"='${teamA}' AND m."EffectiveTo" IS NULL;
    `);
    await actor(ids.master);
    await db.query(`SELECT public.set_kpi_period_status($1,'closed','Chốt kỳ')`, [periodA]);
    await db.query(`SELECT public.set_kpi_period_status($1,'open','Sửa nguồn')`, [periodA]);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT count(*)::integer AS n FROM app_team."KpiPeriodSnapshots"')).rows[0]).toEqual({ n: 1 });
    await actor(ids.member);
    await expect(db.query('SELECT * FROM app_team."KpiPeriodSnapshots"')).rejects.toThrow(/permission denied/);
  });
});
